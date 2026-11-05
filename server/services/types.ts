import type { ProfileData, JobApplicationData, ResumeRankingResult, GapAnalysisResult } from "../llm";
import type { ResumeData, ResumeSettings } from "../resumeGenerator";
import type { GeneratedResume } from "../models";

export type { GeneratedResume } from "../models";

/**
 * The AI capability the app depends on, isolated behind an interface so the
 * concrete LLM implementation can be swapped or faked in tests.
 */
export interface AiPort {
  generateResume(profile: ProfileData, job: JobApplicationData): Promise<GeneratedResume>;
  generateCoverLetter(
    profile: ProfileData,
    job: JobApplicationData,
  ): Promise<{ coverLetter: string }>;
  evaluateResumeRanking(
    resume: GeneratedResume,
    jobDescription: string,
    jobTitle?: string,
    company?: string,
  ): Promise<ResumeRankingResult>;
  analyzeJobFitGap(
    profile: ProfileData,
    jobDescription: string,
    jobTitle?: string,
    company?: string,
  ): Promise<GapAnalysisResult>;
}

export interface ResumeCatalog {
  templates: unknown;
  fonts: unknown;
  colors: unknown;
  fontSizes: unknown;
}

/** Document rendering (PDF/DOCX/HTML), isolated from Puppeteer/docx details. */
export interface DocumentPort {
  renderPdf(data: ResumeData, settings?: Partial<ResumeSettings>): Promise<Buffer>;
  renderDocx(data: ResumeData, settings?: Partial<ResumeSettings>): Promise<Buffer>;
  renderHtml(data: ResumeData, settings?: Partial<ResumeSettings>): string;
  catalog(): ResumeCatalog;
}
