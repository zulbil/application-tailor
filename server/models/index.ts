/**
 * Domain models.
 *
 * The persistence models (rows) live in `@shared/schema` and are re-exported
 * here so the rest of the server imports its types from one place. Types that
 * are shaped by the domain rather than the database are defined here.
 */
export type {
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
  InsertWeeklyChallenge,
  ApplicationStatus,
} from "@shared/schema";

import type { Profile, Experience, Education, WeeklyChallenge } from "@shared/schema";

/** A profile with its child collections — the unit most services operate on. */
export interface ProfileAggregate {
  profile: Profile;
  experiences: Experience[];
  education: Education[];
}

/** The current week's challenge plus derived progress. */
export interface CurrentChallenge {
  challenge: WeeklyChallenge;
  progress: number;
  shouldRemind: boolean;
}

/** Structured resume produced by the AI generator and stored on an application. */
export interface GeneratedResume {
  logline: string[];
  experiences: Array<{
    company: string;
    title: string;
    location: string;
    start: string;
    end: string;
    bullets: string[];
  }>;
  technologies: string;
  relevantSkills: string[];
}
