import { Profile, JobApplication, GeneratedResume, GeneratedCoverLetter } from "./types";

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

  generateResume: async (data: JobApplication): Promise<GeneratedResume> => {
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

  generateCoverLetter: async (data: JobApplication): Promise<GeneratedCoverLetter> => {
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
};
