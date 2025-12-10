import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { 
  profiles, 
  experiences, 
  type Profile, 
  type InsertProfile,
  type Experience,
  type InsertExperience
} from "@shared/schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getProfile(): Promise<{ profile: Profile; experiences: Experience[] } | null>;
  saveProfile(profile: InsertProfile, experiencesData: InsertExperience[]): Promise<{ profile: Profile; experiences: Experience[] }>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(): Promise<{ profile: Profile; experiences: Experience[] } | null> {
    const profileRows = await db.select().from(profiles).limit(1);
    
    if (profileRows.length === 0) {
      return null;
    }

    const profile = profileRows[0];
    const experiencesRows = await db
      .select()
      .from(experiences)
      .where(eq(experiences.profileId, profile.id));

    return {
      profile,
      experiences: experiencesRows,
    };
  }

  async saveProfile(
    profileData: InsertProfile,
    experiencesData: InsertExperience[]
  ): Promise<{ profile: Profile; experiences: Experience[] }> {
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

    return {
      profile,
      experiences: insertedExperiences,
    };
  }
}

export const storage = new DatabaseStorage();
