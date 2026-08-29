import { eq } from "drizzle-orm";
import { profiles, experiences, education } from "@shared/schema";
import type { Database } from "../db";
import type {
  ProfileAggregate,
  Profile,
  Experience,
  Education,
  InsertProfile,
  InsertExperience,
  InsertEducation,
} from "../models";
import type { ProfileRepository } from "./types";

export class DrizzleProfileRepository implements ProfileRepository {
  constructor(private readonly db: Database) {}

  async findAggregateByUserId(userId: string): Promise<ProfileAggregate | null> {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) return null;

    const [experienceRows, educationRows] = await Promise.all([
      this.db.select().from(experiences).where(eq(experiences.profileId, profile.id)),
      this.db.select().from(education).where(eq(education.profileId, profile.id)),
    ]);

    return { profile, experiences: experienceRows, education: educationRows };
  }

  /**
   * Upserts the profile row and replaces its child collections wholesale.
   * NOTE: not yet transactional — tracked as Phase 4.2 in REFACTOR_PLAN.md.
   */
  async save(
    userId: string,
    profileData: InsertProfile,
    experiencesData: InsertExperience[],
    educationData: InsertEducation[],
  ): Promise<ProfileAggregate> {
    const [existing] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    let profile: Profile;
    if (existing) {
      const [updated] = await this.db
        .update(profiles)
        .set(profileData)
        .where(eq(profiles.id, existing.id))
        .returning();
      profile = updated;
      await this.db.delete(experiences).where(eq(experiences.profileId, profile.id));
      await this.db.delete(education).where(eq(education.profileId, profile.id));
    } else {
      const [created] = await this.db
        .insert(profiles)
        .values({ ...profileData, userId })
        .returning();
      profile = created;
    }

    const insertedExperiences: Experience[] = [];
    for (const exp of experiencesData) {
      const [row] = await this.db
        .insert(experiences)
        .values({ ...exp, profileId: profile.id })
        .returning();
      insertedExperiences.push(row);
    }

    const insertedEducation: Education[] = [];
    for (const edu of educationData) {
      const [row] = await this.db
        .insert(education)
        .values({ ...edu, profileId: profile.id })
        .returning();
      insertedEducation.push(row);
    }

    return { profile, experiences: insertedExperiences, education: insertedEducation };
  }
}
