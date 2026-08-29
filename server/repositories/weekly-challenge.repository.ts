import { and, eq } from "drizzle-orm";
import { weeklyChallenges } from "@shared/schema";
import type { Database } from "../db";
import type { WeeklyChallenge } from "../models";
import type { WeeklyChallengeRepository } from "./types";
import { getWeekStart } from "../lib/week";

export class DrizzleWeeklyChallengeRepository implements WeeklyChallengeRepository {
  constructor(private readonly db: Database) {}

  async findCurrent(profileId: string): Promise<WeeklyChallenge | null> {
    const [row] = await this.db
      .select()
      .from(weeklyChallenges)
      .where(
        and(
          eq(weeklyChallenges.profileId, profileId),
          eq(weeklyChallenges.weekStart, getWeekStart()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async createOrUpdateCurrent(profileId: string, goalCount: number): Promise<WeeklyChallenge> {
    const weekStart = getWeekStart();
    const existing = await this.findCurrent(profileId);

    if (existing) {
      const [row] = await this.db
        .update(weeklyChallenges)
        .set({ goalCount })
        .where(eq(weeklyChallenges.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await this.db
      .insert(weeklyChallenges)
      .values({ profileId, weekStart, goalCount })
      .returning();
    return row;
  }

  async markReminderSent(challengeId: string): Promise<void> {
    await this.db
      .update(weeklyChallenges)
      .set({ reminderSent: true })
      .where(eq(weeklyChallenges.id, challengeId));
  }
}
