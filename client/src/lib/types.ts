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
  slug: string;
  generatedResume?: GeneratedResume | null;
  generatedCoverLetter?: string | null;
  resumeSettings?: ResumeSettings | null;
  interviewDate?: string | null;
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

export interface LinkedinCategoryScore {
  score: number;
  feedback: string;
  suggestions: string[];
}

export interface LinkedinAnalysisResult {
  overallScore: number;
  categories: {
    headline: LinkedinCategoryScore;
    about: LinkedinCategoryScore;
    experience: LinkedinCategoryScore;
    skills: LinkedinCategoryScore;
    completeness: LinkedinCategoryScore;
    searchability: LinkedinCategoryScore;
  };
  topStrengths: string[];
  criticalIssues: string[];
  prioritizedActions: string[];
  optimizedHeadline: string;
  optimizedAbout: string;
}

export interface LinkedinProfileInput {
  headline: string;
  about: string;
  experienceText: string;
  skillsText: string;
}

export interface LinkedinAnalysisRecord {
  id: string;
  profileId: string;
  headline: string;
  about: string;
  experienceText: string;
  skillsText: string;
  overallScore: number;
  analysis: LinkedinAnalysisResult;
  createdAt: string;
}

export type DifficultyLevel = "beginner" | "intermediate" | "senior";

export interface TrainingQuestion {
  question: string;
  answer: string;
  explanation: string;
}

export interface SkillTrainingRecord {
  id: string;
  profileId: string;
  skill: string;
  difficulty: DifficultyLevel;
  questions: TrainingQuestion[];
  createdAt: string;
}

export type SimulationDifficulty = "entry" | "mid" | "senior" | "executive";

export interface InterviewQuestion {
  question: string;
  type: "behavioral" | "technical" | "situational" | "competency";
  expectedTopics: string[];
}

export interface AnswerEvaluation {
  score: number;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
}

export interface InterviewSimulation {
  id: string;
  applicationId: string;
  difficulty: SimulationDifficulty;
  questions: InterviewQuestion[];
  answers: string[];
  evaluations: (AnswerEvaluation | null)[];
  currentQuestionIndex: number;
  overallScore: number | null;
  overallFeedback: string | null;
  status: "in_progress" | "completed" | "abandoned";
  createdAt: string;
  completedAt: string | null;
}
