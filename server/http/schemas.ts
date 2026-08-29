import { z } from "zod";
import {
  insertProfileSchema,
  insertExperienceSchema,
  insertEducationSchema,
  applicationStatusEnum,
} from "@shared/schema";

export const saveProfileSchema = z.object({
  profile: insertProfileSchema,
  experiences: z.array(insertExperienceSchema),
  education: z.array(insertEducationSchema),
});

export const generateForProfileSchema = z.object({
  jobDescription: z.string(),
  jobTitle: z.string().optional(),
  companyName: z.string().optional(),
  tone: z.enum(["Professional", "Friendly", "Confident"]),
});

export const generateForApplicationSchema = z.object({
  tone: z.enum(["Professional", "Friendly", "Confident"]),
  jobDescription: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(applicationStatusEnum),
});

export const challengeSchema = z.object({
  goalCount: z.number().int().min(1).max(100),
});

export const acknowledgeChallengeSchema = z.object({
  challengeId: z.string().min(1, "Challenge ID required"),
});

const sectionPreferencesSchema = z.object({
  title: z.string(),
  hidden: z.boolean(),
});

export const resumeSettingsSchema = z.object({
  template: z.enum(["modern", "classic", "minimal", "creative"]).optional(),
  primaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
  sectionOrder: z.array(z.string()).optional(),
  sectionPreferences: z.record(sectionPreferencesSchema).optional(),
});

export const updateContentSchema = z
  .object({
    resume: z.unknown().optional(),
    coverLetter: z.string().optional(),
  })
  .refine((v) => v.resume !== undefined || v.coverLetter !== undefined, {
    message: "Must provide resume or coverLetter to update",
  });

export const createApplicationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  jobDescription: z.string().default(""),
  status: z.enum(applicationStatusEnum).optional(),
});

export type SaveProfileInput = z.infer<typeof saveProfileSchema>;
export type GenerateForProfileInput = z.infer<typeof generateForProfileSchema>;
export type GenerateForApplicationInput = z.infer<typeof generateForApplicationSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type ResumeSettingsInput = z.infer<typeof resumeSettingsSchema>;
