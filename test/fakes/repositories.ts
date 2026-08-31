import { randomUUID } from "crypto";
import type { Repositories } from "../../server/repositories/types";
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
  ProfileAggregate,
} from "../../server/models";

export interface MemoryRepositories extends Repositories {
  /** Direct table access for test seeding/assertions. */
  readonly tables: {
    users: Map<string, User>;
    profiles: Map<string, Profile>;
    experiences: Map<string, Experience>;
    education: Map<string, Education>;
    applications: Map<string, JobApplication>;
    challenges: Map<string, WeeklyChallenge>;
  };
}

/**
 * Map-backed repository set for route tests. Deliberately simple: no
 * transactions, no cascades beyond what the tests exercise. Not a behavioural
 * clone of the Drizzle repositories.
 */
export function createMemoryRepositories(): MemoryRepositories {
  const users = new Map<string, User>();
  const profiles = new Map<string, Profile>();
  const experiences = new Map<string, Experience>();
  const education = new Map<string, Education>();
  const applications = new Map<string, JobApplication>();
  const challenges = new Map<string, WeeklyChallenge>();

  const profileByUser = (userId: string) =>
    [...profiles.values()].find((p) => p.userId === userId);

  const aggregate = (profile: Profile): ProfileAggregate => ({
    profile,
    experiences: [...experiences.values()].filter((e) => e.profileId === profile.id),
    education: [...education.values()].filter((e) => e.profileId === profile.id),
  });

  const patchApplication = (
    id: string,
    patch: Partial<JobApplication>,
  ): JobApplication | null => {
    const existing = applications.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    applications.set(id, updated);
    return updated;
  };

  return {
    tables: { users, profiles, experiences, education, applications, challenges },

    users: {
      async findById(id) {
        return users.get(id);
      },
      async upsert(data: UpsertUser) {
        const now = new Date();
        const existing = data.id ? users.get(data.id) : undefined;
        const record: User = {
          id: data.id ?? randomUUID(),
          email: data.email ?? null,
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          profileImageUrl: data.profileImageUrl ?? null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        users.set(record.id, record);
        return record;
      },
    },

    profiles: {
      async findAggregateByUserId(userId) {
        const profile = profileByUser(userId);
        return profile ? aggregate(profile) : null;
      },
      async save(
        userId: string,
        profileData: InsertProfile,
        experiencesData: InsertExperience[],
        educationData: InsertEducation[],
      ) {
        const existing = profileByUser(userId);
        if (existing) {
          for (const [id, e] of experiences) if (e.profileId === existing.id) experiences.delete(id);
          for (const [id, e] of education) if (e.profileId === existing.id) education.delete(id);
        }
        const profile: Profile = {
          id: existing?.id ?? randomUUID(),
          userId,
          linkedinUrl: "",
          ...profileData,
        };
        profiles.set(profile.id, profile);

        for (const exp of experiencesData) {
          const row = { id: randomUUID(), profileId: profile.id, ...exp } as Experience;
          experiences.set(row.id, row);
        }
        for (const edu of educationData) {
          const row = { id: randomUUID(), profileId: profile.id, ...edu } as Education;
          education.set(row.id, row);
        }
        return aggregate(profile);
      },
    },

    applications: {
      async listByProfile(profileId) {
        return [...applications.values()]
          .filter((a) => a.profileId === profileId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async findById(id) {
        return applications.get(id) ?? null;
      },
      async create(profileId: string, data: InsertJobApplication) {
        const now = new Date();
        const record: JobApplication = {
          id: randomUUID(),
          profileId,
          company: data.company,
          slug: null,
          jobTitle: data.jobTitle,
          jobDescription: data.jobDescription ?? "",
          status: data.status ?? "created",
          generatedResume: null,
          generatedCoverLetter: null,
          resumeSettings: null,
          resumeRanking: null,
          interviewDate: null,
          createdAt: now,
          statusUpdatedAt: now,
        };
        applications.set(record.id, record);
        return record;
      },
      async updateStatus(id: string, status: ApplicationStatus) {
        return patchApplication(id, { status, statusUpdatedAt: new Date() });
      },
      async updateGeneratedContent(id: string, resume: unknown, coverLetter: string) {
        return patchApplication(id, {
          generatedResume: resume,
          generatedCoverLetter: coverLetter,
          resumeRanking: null,
        });
      },
      async updateDetails(id, data) {
        const patch: Partial<JobApplication> = {};
        if (data.company !== undefined) patch.company = data.company;
        if (data.jobTitle !== undefined) patch.jobTitle = data.jobTitle;
        if (data.jobDescription !== undefined) patch.jobDescription = data.jobDescription;
        if (Object.keys(patch).length === 0) return applications.get(id) ?? null;
        return patchApplication(id, patch);
      },
      async updateSettings(id: string, settings: unknown) {
        const existing = applications.get(id);
        if (!existing) return null;
        return patchApplication(id, {
          resumeSettings: { ...((existing.resumeSettings as object) ?? {}), ...(settings as object) },
        });
      },
      async updateRanking(id: string, ranking: unknown) {
        return patchApplication(id, { resumeRanking: ranking });
      },
      async delete(id: string) {
        return applications.delete(id);
      },
    },

    challenges: {
      async findCurrent(profileId) {
        return [...challenges.values()].find((c) => c.profileId === profileId) ?? null;
      },
      async createOrUpdateCurrent(profileId: string, goalCount: number) {
        const existing = [...challenges.values()].find((c) => c.profileId === profileId);
        const record: WeeklyChallenge = existing
          ? { ...existing, goalCount }
          : { id: randomUUID(), profileId, weekStart: "2026-01-05", goalCount, reminderSent: false };
        challenges.set(record.id, record);
        return record;
      },
      async markReminderSent(challengeId: string) {
        const existing = challenges.get(challengeId);
        if (existing) challenges.set(challengeId, { ...existing, reminderSent: true });
      },
    },
  };
}
