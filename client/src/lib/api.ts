import { Profile, JobApplicationInput, GeneratedResume, GeneratedCoverLetter, TrackedApplication, ChallengeData, ApplicationStatus, ResumeSettings, ResumeTemplatesResponse, ResumeRanking, GapAnalysis, LinkedinProfileInput, LinkedinAnalysisResult, LinkedinAnalysisRecord, DifficultyLevel, SkillTrainingRecord, SimulationDifficulty, InterviewSimulation, AnswerEvaluation } from "./types";

interface ProfileResponse {
  profile: Omit<Profile, "experiences" | "education">;
  experiences: Profile["experiences"];
  education: Profile["education"];
}

export const api = {
  getProfile: async (): Promise<Profile> => {
    const response = await fetch("/api/profile");
    if (!response.ok) throw new Error("Failed to fetch profile");
    const data: ProfileResponse = await response.json();
    return {
      ...data.profile,
      experiences: data.experiences,
      education: data.education || [],
    };
  },

  saveProfile: async (profile: Profile): Promise<Profile> => {
    const { experiences, education, ...profileData } = profile;
    
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: profileData,
        experiences: experiences,
        education: education,
      }),
    });
    
    if (!response.ok) throw new Error("Failed to save profile");
    const data: ProfileResponse = await response.json();
    return {
      ...data.profile,
      experiences: data.experiences,
      education: data.education || [],
    };
  },

  generateResume: async (data: JobApplicationInput): Promise<GeneratedResume> => {
    const response = await fetch("/api/generate-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate resume");
    }
    
    return response.json();
  },

  generateCoverLetter: async (data: JobApplicationInput): Promise<GeneratedCoverLetter> => {
    const response = await fetch("/api/generate-cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate cover letter");
    }
    
    return response.json();
  },

  getApplications: async (): Promise<TrackedApplication[]> => {
    const response = await fetch("/api/applications");
    if (!response.ok) throw new Error("Failed to fetch applications");
    return response.json();
  },

  getApplicationBySlug: async (slug: string): Promise<TrackedApplication> => {
    const response = await fetch(`/api/applications/slug/${slug}`);
    if (!response.ok) throw new Error("Application not found");
    return response.json();
  },

  createApplication: async (data: { company: string; jobTitle: string; jobDescription: string; status?: ApplicationStatus }): Promise<TrackedApplication> => {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create application");
    }
    
    return response.json();
  },

  updateApplicationStatus: async (id: string, status: ApplicationStatus): Promise<TrackedApplication> => {
    const response = await fetch(`/api/applications/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update application status");
    }
    
    return response.json();
  },

  deleteApplication: async (id: string): Promise<void> => {
    const response = await fetch(`/api/applications/${id}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete application");
    }
  },

  getApplication: async (id: string): Promise<TrackedApplication> => {
    const response = await fetch(`/api/applications/${id}`);
    if (!response.ok) throw new Error("Failed to fetch application");
    return response.json();
  },

  generateForApplication: async (
    id: string, 
    tone: "Professional" | "Friendly" | "Confident",
    updates?: { jobDescription?: string; jobTitle?: string; company?: string },
    gapContext?: { jobMatch: number; criticalGaps: string[]; strongMatches: string[]; isLowMatch: boolean }
  ): Promise<{ resume: GeneratedResume; coverLetter: string; unsupportedNumbers?: string[] }> => {
    const response = await fetch(`/api/applications/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone, ...updates, gapContext }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate application materials");
    }
    
    return response.json();
  },

  getChallenge: async (): Promise<ChallengeData | null> => {
    const response = await fetch("/api/challenge");
    if (!response.ok) throw new Error("Failed to fetch challenge");
    return response.json();
  },

  getApplicationAnalytics: async (range: string): Promise<{ labels: string[]; counts: number[]; total: number }> => {
    const response = await fetch(`/api/analytics/applications?range=${range}`);
    if (!response.ok) throw new Error("Failed to fetch analytics");
    return response.json();
  },

  createChallenge: async (goalCount: number): Promise<ChallengeData> => {
    const response = await fetch("/api/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalCount }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create challenge");
    }
    
    return response.json();
  },

  acknowledgeReminder: async (challengeId: string): Promise<void> => {
    const response = await fetch("/api/challenge/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to acknowledge reminder");
    }
  },

  getResumeTemplates: async (): Promise<ResumeTemplatesResponse> => {
    const response = await fetch("/api/resume-templates");
    if (!response.ok) throw new Error("Failed to fetch templates");
    return response.json();
  },

  updateResumeSettings: async (id: string, settings: Partial<ResumeSettings>): Promise<TrackedApplication> => {
    const response = await fetch(`/api/applications/${id}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update settings");
    }
    
    return response.json();
  },

  getResumePreviewUrl: (id: string): string => {
    return `/api/applications/${id}/resume-preview`;
  },

  getResumePdfUrl: (id: string): string => {
    return `/api/applications/${id}/resume.pdf`;
  },

  getResumeDocxUrl: (id: string): string => {
    return `/api/applications/${id}/resume.docx`;
  },

  updateResumeContent: async (id: string, resume: any): Promise<TrackedApplication> => {
    const response = await fetch(`/api/applications/${id}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update resume content");
    }
    
    return response.json();
  },

  updateCoverLetterContent: async (id: string, coverLetter: string): Promise<TrackedApplication> => {
    const response = await fetch(`/api/applications/${id}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverLetter }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update cover letter");
    }
    
    return response.json();
  },

  evaluateResumeRanking: async (id: string): Promise<ResumeRanking> => {
    const response = await fetch(`/api/applications/${id}/ranking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to evaluate resume");
    }
    
    return response.json();
  },

  getCachedRanking: async (id: string): Promise<ResumeRanking | null> => {
    const response = await fetch(`/api/applications/${id}/ranking`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error("Failed to fetch ranking");
    }
    return response.json();
  },

  analyzeGap: async (data: JobApplicationInput): Promise<GapAnalysis> => {
    const response = await fetch("/api/analyze-gap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to analyze job fit");
    }
    
    return response.json();
  },

  analyzeLinkedinProfile: async (data: LinkedinProfileInput): Promise<LinkedinAnalysisResult> => {
    const response = await fetch("/api/linkedin/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to analyze LinkedIn profile");
    }
    
    return response.json();
  },

  getLinkedinAnalyses: async (): Promise<LinkedinAnalysisRecord[]> => {
    const response = await fetch("/api/linkedin/analyses");
    if (!response.ok) throw new Error("Failed to fetch LinkedIn analyses");
    return response.json();
  },

  getLatestLinkedinAnalysis: async (): Promise<LinkedinAnalysisRecord | null> => {
    const response = await fetch("/api/linkedin/latest");
    if (!response.ok) throw new Error("Failed to fetch latest analysis");
    return response.json();
  },

  getSkillsList: async (): Promise<string[]> => {
    const response = await fetch("/api/skills/list");
    if (!response.ok) throw new Error("Failed to fetch skills list");
    return response.json();
  },

  generateSkillTraining: async (skill: string, difficulty: DifficultyLevel): Promise<SkillTrainingRecord> => {
    const response = await fetch("/api/skills/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, difficulty }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate training");
    }
    
    return response.json();
  },

  getSkillTraining: async (skill: string, difficulty: DifficultyLevel): Promise<SkillTrainingRecord | null> => {
    const response = await fetch(`/api/skills/training?skill=${encodeURIComponent(skill)}&difficulty=${difficulty}`);
    if (!response.ok) throw new Error("Failed to fetch training");
    return response.json();
  },

  getAllSkillTraining: async (): Promise<SkillTrainingRecord[]> => {
    const response = await fetch("/api/skills/training");
    if (!response.ok) throw new Error("Failed to fetch all training");
    return response.json();
  },

  getSimulations: async (applicationId: string): Promise<InterviewSimulation[]> => {
    const response = await fetch(`/api/applications/${applicationId}/simulations`);
    if (!response.ok) throw new Error("Failed to fetch simulations");
    return response.json();
  },

  createSimulation: async (applicationId: string, difficulty: SimulationDifficulty): Promise<InterviewSimulation> => {
    const response = await fetch(`/api/applications/${applicationId}/simulations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty }),
    });
    if (!response.ok) throw new Error("Failed to create simulation");
    return response.json();
  },

  getSimulation: async (simulationId: string): Promise<InterviewSimulation> => {
    const response = await fetch(`/api/simulations/${simulationId}`);
    if (!response.ok) throw new Error("Failed to fetch simulation");
    return response.json();
  },

  submitAnswer: async (simulationId: string, questionIndex: number, answer: string): Promise<{ simulation: InterviewSimulation; evaluation: AnswerEvaluation }> => {
    const response = await fetch(`/api/simulations/${simulationId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex, answer }),
    });
    if (!response.ok) throw new Error("Failed to submit answer");
    return response.json();
  },

  completeSimulation: async (simulationId: string): Promise<InterviewSimulation> => {
    const response = await fetch(`/api/simulations/${simulationId}/complete`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to complete simulation");
    return response.json();
  },
};
