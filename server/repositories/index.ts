import { db } from "../db";
import { DrizzleUserRepository } from "./user.repository";
import { DrizzleProfileRepository } from "./profile.repository";
import { DrizzleJobApplicationRepository } from "./job-application.repository";
import { DrizzleWeeklyChallengeRepository } from "./weekly-challenge.repository";
import type { Repositories } from "./types";

export type {
  Repositories,
  UserRepository,
  ProfileRepository,
  JobApplicationRepository,
  WeeklyChallengeRepository,
} from "./types";

/** The production repository set, backed by the shared Drizzle connection. */
export function createRepositories(): Repositories {
  return {
    users: new DrizzleUserRepository(db),
    profiles: new DrizzleProfileRepository(db),
    applications: new DrizzleJobApplicationRepository(db),
    challenges: new DrizzleWeeklyChallengeRepository(db),
  };
}
