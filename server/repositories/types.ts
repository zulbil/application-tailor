import type {
  User,
  UpsertUser,
  InsertProfile,
  InsertExperience,
  InsertEducation,
  JobApplication,
  InsertJobApplication,
  WeeklyChallenge,
  ApplicationStatus,
  ProfileAggregate,
} from "../models";

export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  upsert(user: UpsertUser): Promise<User>;
}

export interface ProfileRepository {
  findAggregateByUserId(userId: string): Promise<ProfileAggregate | null>;
  save(
    userId: string,
    profile: InsertProfile,
    experiences: InsertExperience[],
    education: InsertEducation[],
  ): Promise<ProfileAggregate>;
}

export interface ApplicationDetailsPatch {
  company?: string;
  jobTitle?: string;
  jobDescription?: string;
}

export interface JobApplicationRepository {
  listByProfile(profileId: string): Promise<JobApplication[]>;
  findById(id: string): Promise<JobApplication | null>;
  create(profileId: string, data: InsertJobApplication): Promise<JobApplication>;
  updateStatus(id: string, status: ApplicationStatus): Promise<JobApplication | null>;
  updateGeneratedContent(
    id: string,
    resume: unknown,
    coverLetter: string,
  ): Promise<JobApplication | null>;
  updateDetails(id: string, data: ApplicationDetailsPatch): Promise<JobApplication | null>;
  updateSettings(id: string, settings: unknown): Promise<JobApplication | null>;
  updateRanking(id: string, ranking: unknown): Promise<JobApplication | null>;
  delete(id: string): Promise<boolean>;
}

export interface WeeklyChallengeRepository {
  findCurrent(profileId: string): Promise<WeeklyChallenge | null>;
  createOrUpdateCurrent(profileId: string, goalCount: number): Promise<WeeklyChallenge>;
  markReminderSent(challengeId: string): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  profiles: ProfileRepository;
  applications: JobApplicationRepository;
  challenges: WeeklyChallengeRepository;
}
