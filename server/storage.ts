import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { 
  profiles, 
  experiences,
  education,
  type Profile, 
  type InsertProfile,
  type Experience,
  type InsertExperience,
  type Education,
  type InsertEducation
} from "@shared/schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getProfile(): Promise<{ profile: Profile; experiences: Experience[]; education: Education[] } | null>;
  saveProfile(profile: InsertProfile, experiencesData: InsertExperience[], educationData: InsertEducation[]): Promise<{ profile: Profile; experiences: Experience[]; education: Education[] }>;
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
}

export const storage = new DatabaseStorage();
