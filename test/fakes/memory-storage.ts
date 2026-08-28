import { randomUUID } from "crypto";
import type { IStorage } from "../../server/storage";
import type {
  User,
  UpsertUser,
  Profile,
  InsertProfile,
  Experience,
  InsertExperience,
  Education,
  InsertEducation,
  JobApplication,
  InsertJobApplication,
  WeeklyChallenge,
  ApplicationStatus,
} from "@shared/schema";

/**
 * In-memory IStorage for route tests. Deliberately simple: no transactions,
 * no cross-table cascades beyond what the tests exercise. Not a behavioral
 * clone of DatabaseStorage — just enough to drive HTTP handlers.
 */
export class MemoryStorage implements IStorage {
  users = new Map<string, User>();
  profiles = new Map<string, Profile>();
  experiences = new Map<string, Experience>();
  education = new Map<string, Education>();
  applications = new Map<string, JobApplication>();
  challenges = new Map<string, WeeklyChallenge>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const now = new Date();
    const existing = user.id ? this.users.get(user.id) : undefined;
    const record: User = {
      id: user.id ?? randomUUID(),
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.users.set(record.id, record);
    return record;
  }

  private profileByUser(userId: string): Profile | undefined {
    return [...this.profiles.values()].find((p) => p.userId === userId);
  }

  async getProfileByUserId(userId: string) {
    const profile = this.profileByUser(userId);
    if (!profile) return null;
    return {
      profile,
      experiences: [...this.experiences.values()].filter((e) => e.profileId === profile.id),
      education: [...this.education.values()].filter((e) => e.profileId === profile.id),
    };
  }

  async saveProfile(
    userId: string,
    profileData: InsertProfile,
    experiencesData: InsertExperience[],
    educationData: InsertEducation[],
  ) {
    const existing = this.profileByUser(userId);
    if (existing) {
      for (const [id, e] of this.experiences) if (e.profileId === existing.id) this.experiences.delete(id);
      for (const [id, e] of this.education) if (e.profileId === existing.id) this.education.delete(id);
    }
    const profile: Profile = {
      id: existing?.id ?? randomUUID(),
      userId,
      linkedinUrl: "",
      ...profileData,
    };
    this.profiles.set(profile.id, profile);

    const experiences = experiencesData.map((exp) => {
      const record = { id: randomUUID(), profileId: profile.id, ...exp } as Experience;
      this.experiences.set(record.id, record);
      return record;
    });
    const education = educationData.map((edu) => {
      const record = { id: randomUUID(), profileId: profile.id, ...edu } as Education;
      this.education.set(record.id, record);
      return record;
    });

    return { profile, experiences, education };
  }

  async getJobApplications(profileId: string): Promise<JobApplication[]> {
    return [...this.applications.values()]
      .filter((a) => a.profileId === profileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getJobApplication(id: string): Promise<JobApplication | null> {
    return this.applications.get(id) ?? null;
  }

  async createJobApplication(profileId: string, data: InsertJobApplication): Promise<JobApplication> {
    const now = new Date();
    const record: JobApplication = {
      id: randomUUID(),
      profileId,
      company: data.company,
      jobTitle: data.jobTitle,
      jobDescription: data.jobDescription ?? "",
      status: data.status ?? "created",
      generatedResume: null,
      generatedCoverLetter: null,
      resumeSettings: null,
      resumeRanking: null,
      createdAt: now,
      statusUpdatedAt: now,
    };
    this.applications.set(record.id, record);
    return record;
  }

  private patch(id: string, patch: Partial<JobApplication>): JobApplication | null {
    const existing = this.applications.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.applications.set(id, updated);
    return updated;
  }

  async updateJobApplicationStatus(id: string, status: ApplicationStatus) {
    return this.patch(id, { status, statusUpdatedAt: new Date() });
  }

  async updateJobApplicationGeneratedContent(id: string, resume: any, coverLetter: string) {
    return this.patch(id, { generatedResume: resume, generatedCoverLetter: coverLetter, resumeRanking: null });
  }

  async updateJobApplicationDetails(id: string, data: { company?: string; jobTitle?: string; jobDescription?: string }) {
    const patch: Partial<JobApplication> = {};
    if (data.company !== undefined) patch.company = data.company;
    if (data.jobTitle !== undefined) patch.jobTitle = data.jobTitle;
    if (data.jobDescription !== undefined) patch.jobDescription = data.jobDescription;
    return this.patch(id, patch);
  }

  async updateJobApplicationSettings(id: string, settings: any) {
    const existing = this.applications.get(id);
    if (!existing) return null;
    return this.patch(id, { resumeSettings: { ...(existing.resumeSettings as object), ...settings } });
  }

  async updateJobApplicationRanking(id: string, ranking: any) {
    return this.patch(id, { resumeRanking: ranking });
  }

  async deleteJobApplication(id: string): Promise<boolean> {
    return this.applications.delete(id);
  }

  async getCurrentChallenge(profileId: string) {
    const challenge = [...this.challenges.values()].find((c) => c.profileId === profileId);
    if (!challenge) return null;
    return { challenge, progress: 0, shouldRemind: !challenge.reminderSent };
  }

  async createOrUpdateChallenge(profileId: string, goalCount: number): Promise<WeeklyChallenge> {
    let challenge = [...this.challenges.values()].find((c) => c.profileId === profileId);
    if (challenge) {
      challenge = { ...challenge, goalCount };
    } else {
      challenge = { id: randomUUID(), profileId, weekStart: "2026-01-01", goalCount, reminderSent: false };
    }
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  async acknowledgeReminder(challengeId: string): Promise<void> {
    const challenge = this.challenges.get(challengeId);
    if (challenge) this.challenges.set(challengeId, { ...challenge, reminderSent: true });
  }
}
