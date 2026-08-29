import type { ProfileRepository, JobApplicationRepository } from "../repositories/types";
import type { AiPort, GeneratedResume } from "./types";
import type { GapAnalysisResult, ResumeRankingResult } from "../openai";
import type { GenerateForProfileInput, GenerateForApplicationInput } from "../http/schemas";
import type { ApplicationService } from "./application.service";
import { BadRequestError, NotFoundError } from "../http/errors";
import { toAiProfile } from "./mappers";

const NO_PROFILE = "Please save your profile first";
const NO_RESUME = "Resume not found. Generate one first.";

export class GenerationService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly applications: JobApplicationRepository,
    private readonly applicationService: ApplicationService,
    private readonly ai: AiPort,
  ) {}

  private async requireProfile(userId: string) {
    const profile = await this.profiles.findAggregateByUserId(userId);
    if (!profile) throw new BadRequestError(NO_PROFILE);
    return profile;
  }

  async resumeForProfile(
    userId: string,
    input: GenerateForProfileInput,
  ): Promise<GeneratedResume> {
    const profile = await this.requireProfile(userId);
    return this.ai.generateResume(toAiProfile(profile), {
      jobDescription: input.jobDescription,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      tone: input.tone,
    });
  }

  async coverLetterForProfile(
    userId: string,
    input: GenerateForProfileInput,
  ): Promise<{ coverLetter: string }> {
    const profile = await this.requireProfile(userId);
    return this.ai.generateCoverLetter(toAiProfile(profile), {
      jobDescription: input.jobDescription,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      tone: input.tone,
    });
  }

  async analyzeGap(
    userId: string,
    input: GenerateForProfileInput,
  ): Promise<GapAnalysisResult> {
    const profile = await this.requireProfile(userId);
    return this.ai.analyzeJobFitGap(
      toAiProfile(profile),
      input.jobDescription,
      input.jobTitle,
      input.companyName,
    );
  }

  async generateForApplication(
    userId: string,
    applicationId: string,
    input: GenerateForApplicationInput,
  ): Promise<{ resume: GeneratedResume; coverLetter: string }> {
    const { profile } = await this.applicationService.requireOwnedWithProfile(
      userId,
      applicationId,
    );

    let application = await this.applications.findById(applicationId);
    if (!application) throw new NotFoundError("Application not found");

    if (
      input.jobDescription !== undefined ||
      input.jobTitle !== undefined ||
      input.company !== undefined
    ) {
      application =
        (await this.applications.updateDetails(applicationId, {
          company: input.company,
          jobTitle: input.jobTitle,
          jobDescription: input.jobDescription,
        })) || application;
    }

    const job = {
      jobDescription: application.jobDescription,
      jobTitle: application.jobTitle,
      companyName: application.company,
      tone: input.tone,
    };

    const aiProfile = toAiProfile(profile);
    const [resume, coverLetter] = await Promise.all([
      this.ai.generateResume(aiProfile, job),
      this.ai.generateCoverLetter(aiProfile, job),
    ]);

    await this.applications.updateGeneratedContent(
      applicationId,
      resume,
      coverLetter.coverLetter,
    );

    return { resume, coverLetter: coverLetter.coverLetter };
  }

  async evaluateRanking(userId: string, applicationId: string): Promise<ResumeRankingResult> {
    const { application } = await this.applicationService.loadOwned(userId, applicationId);
    if (!application || !application.generatedResume) {
      throw new NotFoundError(NO_RESUME);
    }

    const ranking = await this.ai.evaluateResumeRanking(
      application.generatedResume as GeneratedResume,
      application.jobDescription,
      application.jobTitle,
      application.company,
    );

    await this.applications.updateRanking(applicationId, ranking);
    return ranking;
  }

  async getCachedRanking(userId: string, applicationId: string): Promise<unknown> {
    const application = await this.applicationService.requireOwned(userId, applicationId);
    if (!application.resumeRanking) {
      throw new NotFoundError("No ranking available. Evaluate first.");
    }
    return application.resumeRanking;
  }
}
