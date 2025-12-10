import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { 
  profiles, 
  experiences,
  education,
  jobApplications,
  weeklyChallenges,
  type Profile, 
  type InsertProfile,
  type Experience,
  type InsertExperience,
  type Education,
  type InsertEducation,
  type JobApplication,
  type InsertJobApplication,
  type WeeklyChallenge,
  type InsertWeeklyChallenge,
  type ApplicationStatus
} from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export interface IStorage {
  getProfile(): Promise<{ profile: Profile; experiences: Experience[]; education: Education[] } | null>;
  saveProfile(profile: InsertProfile, experiencesData: InsertExperience[], educationData: InsertEducation[]): Promise<{ profile: Profile; experiences: Experience[]; education: Education[] }>;
  
  getJobApplications(profileId: string): Promise<JobApplication[]>;
  createJobApplication(profileId: string, data: InsertJobApplication): Promise<JobApplication>;
  updateJobApplicationStatus(id: string, status: ApplicationStatus): Promise<JobApplication | null>;
  deleteJobApplication(id: string): Promise<boolean>;
  
  getCurrentChallenge(profileId: string): Promise<{ challenge: WeeklyChallenge; progress: number; shouldRemind: boolean } | null>;
  createOrUpdateChallenge(profileId: string, goalCount: number): Promise<WeeklyChallenge>;
  acknowledgeReminder(challengeId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(): Promise<{ profile: Profile; experiences: Experience[]; education: Education[] } | null> {
    const profileRows = await db.select().from(profiles).limit(1);
    
    if (profileRows.length === 0) {
      return null;
    }

    const profile = profileRows[0];
    const experiencesRows = await db
      .select()
      .from(experiences)
      .where(eq(experiences.profileId, profile.id));
    
    const educationRows = await db
      .select()
      .from(education)
      .where(eq(education.profileId, profile.id));

    return {
      profile,
      experiences: experiencesRows,
      education: educationRows,
    };
  }

  async saveProfile(
    profileData: InsertProfile,
    experiencesData: InsertExperience[],
    educationData: InsertEducation[]
  ): Promise<{ profile: Profile; experiences: Experience[]; education: Education[] }> {
    const existingProfileRows = await db.select().from(profiles).limit(1);

    let profile: Profile;

    if (existingProfileRows.length > 0) {
      const [updatedProfile] = await db
        .update(profiles)
        .set(profileData)
        .where(eq(profiles.id, existingProfileRows[0].id))
        .returning();
      profile = updatedProfile;

      await db.delete(experiences).where(eq(experiences.profileId, profile.id));
      await db.delete(education).where(eq(education.profileId, profile.id));
    } else {
      const [newProfile] = await db.insert(profiles).values(profileData).returning();
      profile = newProfile;
    }

    const insertedExperiences: Experience[] = [];
    for (const exp of experiencesData) {
      const [inserted] = await db
        .insert(experiences)
        .values({ ...exp, profileId: profile.id })
        .returning();
      insertedExperiences.push(inserted);
    }

    const insertedEducation: Education[] = [];
    for (const edu of educationData) {
      const [inserted] = await db
        .insert(education)
        .values({ ...edu, profileId: profile.id })
        .returning();
      insertedEducation.push(inserted);
    }

    return {
      profile,
      experiences: insertedExperiences,
      education: insertedEducation,
    };
  }

  async getJobApplications(profileId: string): Promise<JobApplication[]> {
    const results = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.profileId, profileId));
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createJobApplication(profileId: string, data: InsertJobApplication): Promise<JobApplication> {
    const [application] = await db
      .insert(jobApplications)
      .values({ 
        ...data, 
        profileId,
        status: data.status || "created"
      })
      .returning();
    return application;
  }

  async updateJobApplicationStatus(id: string, status: ApplicationStatus): Promise<JobApplication | null> {
    const [updated] = await db
      .update(jobApplications)
      .set({ status, statusUpdatedAt: new Date() })
      .where(eq(jobApplications.id, id))
      .returning();
    return updated || null;
  }

  async deleteJobApplication(id: string): Promise<boolean> {
    const result = await db
      .delete(jobApplications)
      .where(eq(jobApplications.id, id))
      .returning();
    return result.length > 0;
  }

  async getCurrentChallenge(profileId: string): Promise<{ challenge: WeeklyChallenge; progress: number; shouldRemind: boolean } | null> {
    const weekStart = getWeekStart();
    
    const challenges = await db
      .select()
      .from(weeklyChallenges)
      .where(and(
        eq(weeklyChallenges.profileId, profileId),
        eq(weeklyChallenges.weekStart, weekStart)
      ))
      .limit(1);

    if (challenges.length === 0) {
      return null;
    }

    const challenge = challenges[0];
    
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const applications = await db
      .select()
      .from(jobApplications)
      .where(and(
        eq(jobApplications.profileId, profileId),
        gte(jobApplications.statusUpdatedAt, weekStartDate),
        lte(jobApplications.statusUpdatedAt, weekEndDate)
      ));

    const progress = applications.filter(a => 
      a.status === 'applied' || a.status === 'interviewing' || a.status === 'offered'
    ).length;

    return {
      challenge,
      progress,
      shouldRemind: !challenge.reminderSent
    };
  }

  async createOrUpdateChallenge(profileId: string, goalCount: number): Promise<WeeklyChallenge> {
    const weekStart = getWeekStart();
    
    const existing = await db
      .select()
      .from(weeklyChallenges)
      .where(and(
        eq(weeklyChallenges.profileId, profileId),
        eq(weeklyChallenges.weekStart, weekStart)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(weeklyChallenges)
        .set({ goalCount })
        .where(eq(weeklyChallenges.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(weeklyChallenges)
      .values({ profileId, weekStart, goalCount })
      .returning();
    return created;
  }

  async acknowledgeReminder(challengeId: string): Promise<void> {
    await db
      .update(weeklyChallenges)
      .set({ reminderSent: true })
      .where(eq(weeklyChallenges.id, challengeId));
  }
}

export const storage = new DatabaseStorage();
