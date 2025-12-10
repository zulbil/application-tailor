import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertProfileSchema, insertExperienceSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { generateTailoredResume, generateCoverLetter } from "./openai";

const saveProfileSchema = z.object({
  profile: insertProfileSchema,
  experiences: z.array(insertExperienceSchema),
});

const generateResumeSchema = z.object({
  jobDescription: z.string(),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  tone: z.enum(["Professional", "Friendly", "Confident"]),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/profile", async (req, res) => {
    try {
      const data = await storage.getProfile();
      
      if (!data) {
        return res.json({
          profile: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            location: "",
            headline: "",
            skills: "",
          },
          experiences: []
        });
      }

      return res.json({
        profile: {
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
        }))
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", async (req, res) => {
    try {
      const validation = saveProfileSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const { profile, experiences } = validation.data;
      const saved = await storage.saveProfile(profile, experiences);

      return res.json({
        profile: {
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
        }))
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      return res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.post("/api/generate-resume", async (req, res) => {
    try {
      const validation = generateResumeSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const profileData = await storage.getProfile();
      
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

  app.post("/api/generate-cover-letter", async (req, res) => {
    try {
      const validation = generateResumeSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      const profileData = await storage.getProfile();
      
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

  return httpServer;
}
