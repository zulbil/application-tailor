import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertProfileSchema, insertExperienceSchema, insertEducationSchema, applicationStatusEnum } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { generateTailoredResume, generateCoverLetter } from "./openai";
import { setupAuth, isAuthenticated } from "./replitAuth";

const saveProfileSchema = z.object({
  profile: insertProfileSchema,
  experiences: z.array(insertExperienceSchema),
  education: z.array(insertEducationSchema),
});

const generateResumeSchema = z.object({
  jobDescription: z.string(),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  tone: z.enum(["Professional", "Friendly", "Confident"]),
});

const generateForApplicationSchema = z.object({
  applicationId: z.string(),
  tone: z.enum(["Professional", "Friendly", "Confident"]),
  jobDescription: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(applicationStatusEnum),
});

const challengeSchema = z.object({
  goalCount: z.number().int().min(1).max(100),
});

const createApplicationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  jobDescription: z.string().default(""),
  status: z.enum(applicationStatusEnum).optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await storage.getProfileByUserId(userId);
      
      if (!data) {
        return res.json({
          profile: {
            id: null,
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            location: "",
            headline: "",
            skills: "",
          },
          experiences: [],
          education: []
        });
      }

      return res.json({
        profile: {
          id: data.profile.id,
          firstName: data.profile.firstName,
          lastName: data.profile.lastName,
          email: data.profile.email,
          phone: data.profile.phone,
          location: data.profile.location,
          headline: data.profile.headline,
          skills: data.profile.skills,
        },
        experiences: data.experiences.map(exp => ({
          id: exp.id,
          company: exp.company,
          title: exp.title,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          responsibilities: exp.responsibilities,
        })),
        education: data.education.map(edu => ({
          id: edu.id,
          school: edu.school,
          degree: edu.degree,
          field: edu.field,
          startDate: edu.startDate,
          endDate: edu.endDate,
        }))
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const validation = saveProfileSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const userId = req.user.claims.sub;
      const { profile, experiences, education } = validation.data;
      const saved = await storage.saveProfile(userId, profile, experiences, education);

      return res.json({
        profile: {
          id: saved.profile.id,
          firstName: saved.profile.firstName,
          lastName: saved.profile.lastName,
          email: saved.profile.email,
          phone: saved.profile.phone,
          location: saved.profile.location,
          headline: saved.profile.headline,
          skills: saved.profile.skills,
        },
        experiences: saved.experiences.map(exp => ({
          id: exp.id,
          company: exp.company,
          title: exp.title,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          responsibilities: exp.responsibilities,
        })),
        education: saved.education.map(edu => ({
          id: edu.id,
          school: edu.school,
          degree: edu.degree,
          field: edu.field,
          startDate: edu.startDate,
          endDate: edu.endDate,
        }))
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      return res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.post("/api/generate-resume", isAuthenticated, async (req: any, res) => {
    try {
      const validation = generateResumeSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const userId = req.user.claims.sub;
      const profileData = await storage.getProfileByUserId(userId);
      
      if (!profileData) {
        return res.status(400).json({ error: "Please save your profile first" });
      }

      const result = await generateTailoredResume(
        {
          firstName: profileData.profile.firstName,
          lastName: profileData.profile.lastName,
          email: profileData.profile.email,
          phone: profileData.profile.phone,
          location: profileData.profile.location,
          headline: profileData.profile.headline,
          skills: profileData.profile.skills,
          experiences: profileData.experiences.map(exp => ({
            company: exp.company,
            title: exp.title,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            responsibilities: exp.responsibilities,
          })),
          education: profileData.education.map(edu => ({
            school: edu.school,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
          }))
        },
        validation.data
      );

      return res.json(result);
    } catch (error) {
      console.error("Error generating resume:", error);
      return res.status(500).json({ error: "Failed to generate resume" });
    }
  });

  app.post("/api/generate-cover-letter", isAuthenticated, async (req: any, res) => {
    try {
      const validation = generateResumeSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const userId = req.user.claims.sub;
      const profileData = await storage.getProfileByUserId(userId);
      
      if (!profileData) {
        return res.status(400).json({ error: "Please save your profile first" });
      }

      const result = await generateCoverLetter(
        {
          firstName: profileData.profile.firstName,
          lastName: profileData.profile.lastName,
          email: profileData.profile.email,
          phone: profileData.profile.phone,
          location: profileData.profile.location,
          headline: profileData.profile.headline,
          skills: profileData.profile.skills,
          experiences: profileData.experiences.map(exp => ({
            company: exp.company,
            title: exp.title,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            responsibilities: exp.responsibilities,
          })),
          education: profileData.education.map(edu => ({
            school: edu.school,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
          }))
        },
        validation.data
      );

      return res.json(result);
    } catch (error) {
      console.error("Error generating cover letter:", error);
      return res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  app.get("/api/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = await storage.getProfileByUserId(userId);
      if (!profileData) {
        return res.json([]);
      }
      const applications = await storage.getJobApplications(profileData.profile.id);
      return res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      return res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const application = await storage.getJobApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      return res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      return res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  app.post("/api/applications/:id/generate", isAuthenticated, async (req: any, res) => {
    try {
      const validation = generateForApplicationSchema.safeParse({ ...req.body, applicationId: req.params.id });
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const userId = req.user.claims.sub;
      const profileData = await storage.getProfileByUserId(userId);
      
      if (!profileData) {
        return res.status(400).json({ error: "Please save your profile first" });
      }

      let application = await storage.getJobApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (validation.data.jobDescription !== undefined || validation.data.jobTitle !== undefined || validation.data.company !== undefined) {
        application = await storage.updateJobApplicationDetails(req.params.id, {
          company: validation.data.company,
          jobTitle: validation.data.jobTitle,
          jobDescription: validation.data.jobDescription
        }) || application;
      }

      const jobAppData = {
        jobDescription: application.jobDescription,
        jobTitle: application.jobTitle,
        companyName: application.company,
        tone: validation.data.tone
      };

      const [resumeResult, coverLetterResult] = await Promise.all([
        generateTailoredResume(
          {
            firstName: profileData.profile.firstName,
            lastName: profileData.profile.lastName,
            email: profileData.profile.email,
            phone: profileData.profile.phone,
            location: profileData.profile.location,
            headline: profileData.profile.headline,
            skills: profileData.profile.skills,
            experiences: profileData.experiences.map(exp => ({
              company: exp.company,
              title: exp.title,
              location: exp.location,
              startDate: exp.startDate,
              endDate: exp.endDate,
              responsibilities: exp.responsibilities,
            })),
            education: profileData.education.map(edu => ({
              school: edu.school,
              degree: edu.degree,
              field: edu.field,
              startDate: edu.startDate,
              endDate: edu.endDate,
            }))
          },
          jobAppData
        ),
        generateCoverLetter(
          {
            firstName: profileData.profile.firstName,
            lastName: profileData.profile.lastName,
            email: profileData.profile.email,
            phone: profileData.profile.phone,
            location: profileData.profile.location,
            headline: profileData.profile.headline,
            skills: profileData.profile.skills,
            experiences: profileData.experiences.map(exp => ({
              company: exp.company,
              title: exp.title,
              location: exp.location,
              startDate: exp.startDate,
              endDate: exp.endDate,
              responsibilities: exp.responsibilities,
            })),
            education: profileData.education.map(edu => ({
              school: edu.school,
              degree: edu.degree,
              field: edu.field,
              startDate: edu.startDate,
              endDate: edu.endDate,
            }))
          },
          jobAppData
        )
      ]);

      await storage.updateJobApplicationGeneratedContent(
        req.params.id,
        resumeResult,
        coverLetterResult.coverLetter
      );

      return res.json({
        resume: resumeResult,
        coverLetter: coverLetterResult.coverLetter
      });
    } catch (error) {
      console.error("Error generating for application:", error);
      return res.status(500).json({ error: "Failed to generate resume and cover letter" });
    }
  });

  app.post("/api/applications", isAuthenticated, async (req: any, res) => {
    try {
      const validation = createApplicationSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const userId = req.user.claims.sub;
      const profileData = await storage.getProfileByUserId(userId);
      if (!profileData) {
        return res.status(400).json({ error: "Please save your profile first" });
      }

      const application = await storage.createJobApplication(profileData.profile.id, validation.data);
      return res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      return res.status(500).json({ error: "Failed to create application" });
    }
  });

  app.patch("/api/applications/:id/status", isAuthenticated, async (req, res) => {
    try {
      const validation = updateStatusSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const updated = await storage.updateJobApplicationStatus(req.params.id, validation.data.status);
      if (!updated) {
        return res.status(404).json({ error: "Application not found" });
      }
      return res.json(updated);
    } catch (error) {
      console.error("Error updating application status:", error);
      return res.status(500).json({ error: "Failed to update application status" });
    }
  });

  app.delete("/api/applications/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteJobApplication(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Application not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting application:", error);
      return res.status(500).json({ error: "Failed to delete application" });
    }
  });

  app.get("/api/challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = await storage.getProfileByUserId(userId);
      if (!profileData) {
        return res.json(null);
      }
      const challenge = await storage.getCurrentChallenge(profileData.profile.id);
      return res.json(challenge);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      return res.status(500).json({ error: "Failed to fetch challenge" });
    }
  });

  app.post("/api/challenge", isAuthenticated, async (req: any, res) => {
    try {
      const validation = challengeSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const userId = req.user.claims.sub;
      const profileData = await storage.getProfileByUserId(userId);
      if (!profileData) {
        return res.status(400).json({ error: "Please save your profile first" });
      }

      const challenge = await storage.createOrUpdateChallenge(profileData.profile.id, validation.data.goalCount);
      return res.json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      return res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  app.post("/api/challenge/acknowledge", isAuthenticated, async (req, res) => {
    try {
      const { challengeId } = req.body;
      if (!challengeId) {
        return res.status(400).json({ error: "Challenge ID required" });
      }
      await storage.acknowledgeReminder(challengeId);
      return res.json({ success: true });
    } catch (error) {
      console.error("Error acknowledging reminder:", error);
      return res.status(500).json({ error: "Failed to acknowledge reminder" });
    }
  });

  return httpServer;
}
