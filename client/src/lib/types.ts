export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  responsibilities: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  skills: string; // Comma separated
  experiences: Experience[];
}

export interface JobApplication {
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
