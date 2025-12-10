import { Profile, JobApplicationInput, GeneratedResume, GeneratedCoverLetter, TrackedApplication, ChallengeData, ApplicationStatus } from "./types";

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

  getChallenge: async (): Promise<ChallengeData | null> => {
    const response = await fetch("/api/challenge");
    if (!response.ok) throw new Error("Failed to fetch challenge");
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
};
