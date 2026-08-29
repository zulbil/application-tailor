import type { ProfileRepository } from "../repositories/types";
import type { ResumeSettings } from "../resumeGenerator";
import type { ApplicationService } from "./application.service";
import type { DocumentPort } from "./types";
import { BadRequestError, NotFoundError } from "../http/errors";
import {
  toTailoredResumeData,
  toProfileResumeData,
  PROFILE_EXPORT_SETTINGS,
  safeFilePart,
} from "./mappers";

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface RenderedDocument {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export class ExportService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly applications: ApplicationService,
    private readonly documents: DocumentPort,
  ) {}

  private async requireProfile(userId: string) {
    const profile = await this.profiles.findAggregateByUserId(userId);
    if (!profile) throw new BadRequestError("Profile required");
    return profile;
  }

  /** Profile + application that has a generated resume, else the export errors. */
  private async loadTailored(userId: string, applicationId: string) {
    const profile = await this.requireProfile(userId);
    const { application } = await this.applications.loadOwned(userId, applicationId);
    if (!application || !application.generatedResume) {
      throw new NotFoundError("Resume not found. Generate one first.");
    }
    const data = toTailoredResumeData(profile, application);
    const settings = (application.resumeSettings as ResumeSettings) || ({} as ResumeSettings);
    return { data, settings, company: application.company };
  }

  async applicationPdf(userId: string, applicationId: string): Promise<RenderedDocument> {
    const { data, settings, company } = await this.loadTailored(userId, applicationId);
    return {
      buffer: await this.documents.renderPdf(data, settings),
      filename: `Resume_${safeFilePart(company)}.pdf`,
      contentType: PDF,
    };
  }

  async applicationDocx(userId: string, applicationId: string): Promise<RenderedDocument> {
    const { data, settings, company } = await this.loadTailored(userId, applicationId);
    return {
      buffer: await this.documents.renderDocx(data, settings),
      filename: `Resume_${safeFilePart(company)}.docx`,
      contentType: DOCX,
    };
  }

  async applicationPreviewHtml(userId: string, applicationId: string): Promise<string> {
    const { data, settings } = await this.loadTailored(userId, applicationId);
    return this.documents.renderHtml(data, settings);
  }

  async profilePdf(userId: string): Promise<RenderedDocument> {
    const profile = await this.requireProfile(userId);
    return {
      buffer: await this.documents.renderPdf(
        toProfileResumeData(profile),
        PROFILE_EXPORT_SETTINGS,
      ),
      filename: `Profile_${profile.profile.firstName}_${profile.profile.lastName}.pdf`,
      contentType: PDF,
    };
  }

  async profileDocx(userId: string): Promise<RenderedDocument> {
    const profile = await this.requireProfile(userId);
    return {
      buffer: await this.documents.renderDocx(
        toProfileResumeData(profile),
        PROFILE_EXPORT_SETTINGS,
      ),
      filename: `Profile_${profile.profile.firstName}_${profile.profile.lastName}.docx`,
      contentType: DOCX,
    };
  }
}
