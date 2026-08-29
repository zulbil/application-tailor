import type {
  ProfileRepository,
  JobApplicationRepository,
  WeeklyChallengeRepository,
} from "../repositories/types";
import type { CurrentChallenge, WeeklyChallenge } from "../models";
import { BadRequestError } from "../http/errors";
import { getWeekStart, weekBounds } from "../lib/week";

const COUNTS_AS_PROGRESS = new Set(["applied", "interviewing", "offered"]);

export class ChallengeService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly applications: JobApplicationRepository,
    private readonly challenges: WeeklyChallengeRepository,
  ) {}

  async getCurrent(userId: string): Promise<CurrentChallenge | null> {
    const profile = await this.profiles.findAggregateByUserId(userId);
    if (!profile) return null;

    const challenge = await this.challenges.findCurrent(profile.profile.id);
    if (!challenge) return null;

    const { start, end } = weekBounds(getWeekStart());
    const applications = await this.applications.listByProfile(profile.profile.id);
    const progress = applications.filter((a) => {
      const updatedAt = new Date(a.statusUpdatedAt);
      return (
        COUNTS_AS_PROGRESS.has(a.status) && updatedAt >= start && updatedAt <= end
      );
    }).length;

    return { challenge, progress, shouldRemind: !challenge.reminderSent };
  }

  async createOrUpdate(userId: string, goalCount: number): Promise<WeeklyChallenge> {
    const profile = await this.profiles.findAggregateByUserId(userId);
    if (!profile) throw new BadRequestError("Please save your profile first");
    return this.challenges.createOrUpdateCurrent(profile.profile.id, goalCount);
  }

  acknowledge(challengeId: string): Promise<void> {
    return this.challenges.markReminderSent(challengeId);
  }
}
