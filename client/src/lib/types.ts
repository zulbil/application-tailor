export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  skills: string;
  linkedinUrl?: string;
  experiences: Experience[];
  education: Education[];
}

export interface JobApplicationInput {
  jobDescription: string;
  jobTitle: string;
  companyName: string;
  tone: "Professional" | "Friendly" | "Confident";
}

export interface GeneratedResume {
  logline: string[];
  experiences: {
    company: string;
    title: string;
    location: string;
    start: string;
    end: string;
    bullets: string[];
  }[];
  technologies: string;
  relevantSkills?: string[];
}

export interface GeneratedCoverLetter {
  coverLetter: string;
}

export type ApplicationStatus = "created" | "applied" | "interviewing" | "rejected" | "offered";

export interface SectionPreferences {
  title: string;
  hidden: boolean;
}

export interface ResumeSettings {
  template: "modern" | "classic" | "minimal" | "creative";
  primaryColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  sectionOrder: string[];
  sectionPreferences: Record<string, SectionPreferences>;
}

export interface TrackedApplication {
  id: string;
  profileId: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  status: ApplicationStatus;
  generatedResume?: GeneratedResume | null;
  generatedCoverLetter?: string | null;
  resumeSettings?: ResumeSettings | null;
  createdAt: string;
  statusUpdatedAt: string;
}

export interface ResumeTemplateInfo {
  id: string;
  name: string;
  description: string;
}

export interface FontOption {
  id: string;
  name: string;
  category: string;
}

export interface ColorOption {
  id: string;
  name: string;
}

export interface FontSizeOption {
  id: string;
  name: string;
  description: string;
}

export interface ResumeTemplatesResponse {
  templates: ResumeTemplateInfo[];
  fonts: FontOption[];
  colors: ColorOption[];
  fontSizes: FontSizeOption[];
}

export interface WeeklyChallenge {
  id: string;
  profileId: string;
  weekStart: string;
  goalCount: number;
  reminderSent: boolean;
}

export interface ChallengeData {
  challenge: WeeklyChallenge;
  progress: number;
  shouldRemind: boolean;
}

export interface CategoryScore {
  score: number;
  feedback: string;
}

export interface ResumeRanking {
  overallScore: number;
  interviewProbability: number;
  recommendation: "STRONG_PASS" | "PASS" | "MAYBE" | "WEAK" | "REJECT";
  categories: {
    atsOptimization: CategoryScore;
    humanReadability: CategoryScore;
    jobMatch: CategoryScore;
    impactCommunication: CategoryScore;
    professionalPresentation: CategoryScore;
    truthfulness: CategoryScore;
  };
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  improvements: string[];
}

export interface GapAnalysis {
  shouldGenerateResume: boolean;
  gapAnalysis: {
    jobMatch: number;
    interviewProbability: number;
    criticalGaps: string[];
    strongMatches: string[];
    recommendation: "APPLY" | "SKIP" | "LEARN_FIRST";
    recommendationReason: string;
    suggestedActions: string[];
    betterJobMatches: string[];
    timeToBeQualified: string;
  };
}
