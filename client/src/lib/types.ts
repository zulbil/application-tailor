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
}

export interface GeneratedCoverLetter {
  coverLetter: string;
}

export type ApplicationStatus = "created" | "applied" | "interviewing" | "rejected" | "offered";

export interface TrackedApplication {
  id: string;
  profileId: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  status: ApplicationStatus;
  createdAt: string;
  statusUpdatedAt: string;
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
