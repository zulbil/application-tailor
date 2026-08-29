import { eq } from "drizzle-orm";
import { jobApplications } from "@shared/schema";
import type { Database } from "../db";
import type { JobApplication, InsertJobApplication, ApplicationStatus } from "../models";
import type { JobApplicationRepository, ApplicationDetailsPatch } from "./types";

export class DrizzleJobApplicationRepository implements JobApplicationRepository {
  constructor(private readonly db: Database) {}

  async listByProfile(profileId: string): Promise<JobApplication[]> {
    const rows = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.profileId, profileId));
    return rows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async findById(id: string): Promise<JobApplication | null> {
    const [row] = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, id));
    return row ?? null;
  }

  async create(profileId: string, data: InsertJobApplication): Promise<JobApplication> {
    const [row] = await this.db
      .insert(jobApplications)
      .values({ ...data, profileId, status: data.status || "created" })
      .returning();
    return row;
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<JobApplication | null> {
    const [row] = await this.db
      .update(jobApplications)
      .set({ status, statusUpdatedAt: new Date() })
      .where(eq(jobApplications.id, id))
      .returning();
    return row ?? null;
  }

  async updateGeneratedContent(
    id: string,
    resume: unknown,
    coverLetter: string,
  ): Promise<JobApplication | null> {
    const [row] = await this.db
      .update(jobApplications)
      .set({ generatedResume: resume, generatedCoverLetter: coverLetter, resumeRanking: null })
      .where(eq(jobApplications.id, id))
      .returning();
    return row ?? null;
  }

  async updateDetails(
    id: string,
    data: ApplicationDetailsPatch,
  ): Promise<JobApplication | null> {
    const patch: ApplicationDetailsPatch = {};
    if (data.company !== undefined) patch.company = data.company;
    if (data.jobTitle !== undefined) patch.jobTitle = data.jobTitle;
    if (data.jobDescription !== undefined) patch.jobDescription = data.jobDescription;

    if (Object.keys(patch).length === 0) return this.findById(id);

    const [row] = await this.db
      .update(jobApplications)
      .set(patch)
      .where(eq(jobApplications.id, id))
      .returning();
    return row ?? null;
  }

  async updateSettings(id: string, settings: unknown): Promise<JobApplication | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged = { ...((existing.resumeSettings as object) ?? {}), ...(settings as object) };
    const [row] = await this.db
      .update(jobApplications)
      .set({ resumeSettings: merged })
      .where(eq(jobApplications.id, id))
      .returning();
    return row ?? null;
  }

  async updateRanking(id: string, ranking: unknown): Promise<JobApplication | null> {
    const [row] = await this.db
      .update(jobApplications)
      .set({ resumeRanking: ranking })
      .where(eq(jobApplications.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(jobApplications)
      .where(eq(jobApplications.id, id))
      .returning();
    return rows.length > 0;
  }
}
