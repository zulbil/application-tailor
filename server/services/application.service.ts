import type { ProfileRepository, JobApplicationRepository } from "../repositories/types";
import type { ProfileAggregate, JobApplication, ApplicationStatus } from "../models";
import type { CreateApplicationInput, ResumeSettingsInput } from "../http/schemas";
import { BadRequestError, NotFoundError } from "../http/errors";

const APPLICATION_NOT_FOUND = "Application not found";
const NO_PROFILE = "Please save your profile first";

/**
 * Owns the application lifecycle and the ownership rule: an application is only
 * visible to the user whose profile it belongs to. Every lookup that can't
 * prove ownership surfaces as a 404 so non-owners learn nothing.
 */
export class ApplicationService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly applications: JobApplicationRepository,
  ) {}

  /** Profile + application, or nulls — mirrors the old `loadOwnedApplication`. */
  async loadOwned(
    userId: string,
    applicationId: string,
  ): Promise<{ profile: ProfileAggregate | null; application: JobApplication | null }> {
    const profile = await this.profiles.findAggregateByUserId(userId);
    if (!profile) return { profile: null, application: null };
    const application = await this.applications.findById(applicationId);
    if (!application || application.profileId !== profile.profile.id) {
      return { profile, application: null };
    }
    return { profile, application };
  }

  async requireOwned(userId: string, applicationId: string): Promise<JobApplication> {
    const { application } = await this.loadOwned(userId, applicationId);
    if (!application) throw new NotFoundError(APPLICATION_NOT_FOUND);
    return application;
  }

  async requireOwnedWithProfile(
    userId: string,
    applicationId: string,
  ): Promise<{ profile: ProfileAggregate; application: JobApplication }> {
    const { profile, application } = await this.loadOwned(userId, applicationId);
    if (!profile) throw new BadRequestError(NO_PROFILE);
    if (!application) throw new NotFoundError(APPLICATION_NOT_FOUND);
    return { profile, application };
  }

  async list(userId: string): Promise<JobApplication[]> {
    const profile = await this.profiles.findAggregateByUserId(userId);
    if (!profile) return [];
    return this.applications.listByProfile(profile.profile.id);
  }

  get(userId: string, applicationId: string): Promise<JobApplication> {
    return this.requireOwned(userId, applicationId);
  }

  async create(userId: string, input: CreateApplicationInput): Promise<JobApplication> {
    const profile = await this.profiles.findAggregateByUserId(userId);
    if (!profile) throw new BadRequestError(NO_PROFILE);
    return this.applications.create(profile.profile.id, input);
  }

  async updateStatus(
    userId: string,
    applicationId: string,
    status: ApplicationStatus,
  ): Promise<JobApplication> {
    await this.requireOwned(userId, applicationId);
    const updated = await this.applications.updateStatus(applicationId, status);
    if (!updated) throw new NotFoundError(APPLICATION_NOT_FOUND);
    return updated;
  }

  async remove(userId: string, applicationId: string): Promise<void> {
    await this.requireOwned(userId, applicationId);
    const deleted = await this.applications.delete(applicationId);
    if (!deleted) throw new NotFoundError(APPLICATION_NOT_FOUND);
  }

  async updateSettings(
    userId: string,
    applicationId: string,
    settings: ResumeSettingsInput,
  ): Promise<JobApplication> {
    await this.requireOwned(userId, applicationId);
    const updated = await this.applications.updateSettings(applicationId, settings);
    if (!updated) throw new NotFoundError(APPLICATION_NOT_FOUND);
    return updated;
  }

  async updateContent(
    userId: string,
    applicationId: string,
    patch: { resume?: unknown; coverLetter?: string },
  ): Promise<JobApplication> {
    const application = await this.requireOwned(userId, applicationId);
    const resume = patch.resume !== undefined ? patch.resume : application.generatedResume;
    const coverLetter =
      patch.coverLetter !== undefined
        ? patch.coverLetter
        : application.generatedCoverLetter || "";

    const updated = await this.applications.updateGeneratedContent(
      applicationId,
      resume,
      coverLetter,
    );
    if (!updated) throw new NotFoundError("Failed to update content");
    return updated;
  }
}
