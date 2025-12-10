import { Profile, JobApplication, GeneratedResume, GeneratedCoverLetter } from "./types";

const STORAGE_KEY = "job-application-tailor-profile";

const DEFAULT_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  skills: "",
  experiences: []
};

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  getProfile: async (): Promise<Profile> => {
    await delay(500);
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PROFILE;
  },

  saveProfile: async (profile: Profile): Promise<Profile> => {
    await delay(800);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return profile;
  },

  generateResume: async (data: JobApplication, profile: Profile): Promise<GeneratedResume> => {
    await delay(2000);
    
    // Mock Logic: Generate content based on inputs to feel semi-real
    const skillList = profile.skills.split(",").map(s => s.trim()).filter(Boolean);
    const techStack = skillList.length > 0 ? skillList.slice(0, 5).join(", ") : "React, TypeScript, Node.js";

    return {
      logline: [
        `Experienced ${profile.headline || "Professional"} with a strong background in ${data.jobTitle || "software development"}.`,
        `Proven track record of delivering high-quality solutions for companies like ${profile.experiences[0]?.company || "previous employers"}.`,
        `Passionate about leveraging ${techStack} to drive business success at ${data.companyName || "your company"}.`
      ],
      experiences: profile.experiences.map(exp => ({
        company: exp.company,
        title: exp.title,
        location: exp.location,
        start: exp.startDate,
        end: exp.endDate,
        bullets: [
          `Spearheaded key initiatives at ${exp.company} resulting in a 20% increase in operational efficiency.`,
          `Collaborated with cross-functional teams to deliver projects using ${techStack} ahead of schedule.`,
          `Optimized legacy systems, reducing technical debt and improving performance by 35%.`
        ]
      })),
      technologies: `${techStack}, AWS, Docker, CI/CD, Agile Methodologies`
    };
  },

  generateCoverLetter: async (data: JobApplication, profile: Profile): Promise<GeneratedCoverLetter> => {
    await delay(2000);
    
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const greeting = data.tone === "Friendly" ? "Hi there," : "Dear Hiring Manager,";
    const closing = data.tone === "Friendly" ? "Cheers," : "Sincerely,";
    
    return {
      coverLetter: `${today}\n\n${greeting}\n\nI am writing to express my strong interest in the ${data.jobTitle} position at ${data.companyName}. As a ${profile.headline} based in ${profile.location}, I have followed ${data.companyName}'s work with admiration and believe my background in ${profile.skills.split(",")[0] || "technology"} makes me an ideal candidate for this role.\n\nIn my recent role at ${profile.experiences[0]?.company || "my previous company"}, I successfully delivered multiple high-impact projects. My experience aligns perfectly with your requirements for this position. I am particularly excited about the opportunity to bring my skills in ${profile.skills} to your team.\n\nThank you for considering my application. I look forward to the possibility of discussing how I can contribute to the continued success of ${data.companyName}.\n\n${closing}\n\n${profile.firstName} ${profile.lastName}`
    };
  }
};
