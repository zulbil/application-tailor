import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  location: text("location").notNull(),
  headline: text("headline").notNull(),
  skills: text("skills").notNull(),
  linkedinUrl: text("linkedin_url").default(""),
});

export const experiences = pgTable("experiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  responsibilities: text("responsibilities").notNull(),
});

export const education = pgTable("education", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  school: text("school").notNull(),
  degree: text("degree").notNull(),
  field: text("field").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
});

export const applicationStatusEnum = ["created", "applied", "interviewing", "rejected", "offered"] as const;

export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  slug: varchar("slug").unique(),
  company: text("company").notNull(),
  jobTitle: text("job_title").notNull(),
  jobDescription: text("job_description").notNull(),
  status: text("status").notNull().default("created"),
  generatedResume: jsonb("generated_resume"),
  generatedCoverLetter: text("generated_cover_letter"),
  resumeSettings: jsonb("resume_settings"),
  resumeRanking: jsonb("resume_ranking"),
  interviewDate: timestamp("interview_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  statusUpdatedAt: timestamp("status_updated_at").notNull().defaultNow(),
});

export const weeklyChallenges = pgTable("weekly_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  weekStart: text("week_start").notNull(),
  goalCount: integer("goal_count").notNull().default(5),
  reminderSent: boolean("reminder_sent").notNull().default(false),
});

export const linkedinAnalyses = pgTable("linkedin_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  headline: text("headline").notNull(),
  about: text("about").notNull(),
  experienceText: text("experience_text").notNull(),
  skillsText: text("skills_text").notNull(),
  overallScore: integer("overall_score").notNull(),
  analysis: jsonb("analysis").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const difficultyLevelEnum = ["beginner", "intermediate", "senior"] as const;

export const skillTraining = pgTable("skill_training", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  skill: text("skill").notNull(),
  difficulty: text("difficulty").notNull(),
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trainingCategoryEnum = ["technical", "soft"] as const;
export const trainingDifficultyEnum = ["easy", "medium", "hard"] as const;

export const applicationTraining = pgTable("application_training", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => jobApplications.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  skillFocus: text("skill_focus").notNull(),
  questions: jsonb("questions").notNull(),
  totalQuestions: integer("total_questions").notNull().default(10),
  answeredQuestions: integer("answered_questions").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  readinessScore: integer("readiness_score").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastAttemptAt: timestamp("last_attempt_at"),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  userId: true,
});

export const insertExperienceSchema = createInsertSchema(experiences).omit({
  id: true,
  profileId: true,
});

export const insertEducationSchema = createInsertSchema(education).omit({
  id: true,
  profileId: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  profileId: true,
  createdAt: true,
  statusUpdatedAt: true,
});

export const insertWeeklyChallengeSchema = createInsertSchema(weeklyChallenges).omit({
  id: true,
  profileId: true,
  reminderSent: true,
});

export const insertLinkedinAnalysisSchema = createInsertSchema(linkedinAnalyses).omit({
  id: true,
  profileId: true,
  createdAt: true,
});

export const insertSkillTrainingSchema = createInsertSchema(skillTraining).omit({
  id: true,
  profileId: true,
  createdAt: true,
});

export const insertApplicationTrainingSchema = createInsertSchema(applicationTraining).omit({
  id: true,
  createdAt: true,
  lastAttemptAt: true,
});

export const simulationDifficultyEnum = ["entry", "mid", "senior", "executive"] as const;
export const simulationStatusEnum = ["in_progress", "completed", "abandoned"] as const;

export const interviewSimulations = pgTable("interview_simulations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => jobApplications.id, { onDelete: "cascade" }),
  difficulty: text("difficulty").notNull(),
  status: text("status").notNull().default("in_progress"),
  questions: jsonb("questions").notNull(),
  answers: jsonb("answers").notNull().default([]),
  evaluations: jsonb("evaluations").notNull().default([]),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  overallScore: integer("overall_score"),
  overallFeedback: text("overall_feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertInterviewSimulationSchema = createInsertSchema(interviewSimulations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;
export type Experience = typeof experiences.$inferSelect;
export type InsertEducation = z.infer<typeof insertEducationSchema>;
export type Education = typeof education.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertWeeklyChallenge = z.infer<typeof insertWeeklyChallengeSchema>;
export type WeeklyChallenge = typeof weeklyChallenges.$inferSelect;
export type InsertLinkedinAnalysis = z.infer<typeof insertLinkedinAnalysisSchema>;
export type LinkedinAnalysis = typeof linkedinAnalyses.$inferSelect;
export type InsertSkillTraining = z.infer<typeof insertSkillTrainingSchema>;
export type SkillTraining = typeof skillTraining.$inferSelect;
export type InsertApplicationTraining = z.infer<typeof insertApplicationTrainingSchema>;
export type ApplicationTraining = typeof applicationTraining.$inferSelect;
export type InsertInterviewSimulation = z.infer<typeof insertInterviewSimulationSchema>;
export type InterviewSimulation = typeof interviewSimulations.$inferSelect;
export type ApplicationStatus = typeof applicationStatusEnum[number];
export type DifficultyLevel = typeof difficultyLevelEnum[number];
export type TrainingCategory = typeof trainingCategoryEnum[number];
export type TrainingDifficulty = typeof trainingDifficultyEnum[number];
export type SimulationDifficulty = typeof simulationDifficultyEnum[number];
export type SimulationStatus = typeof simulationStatusEnum[number];
