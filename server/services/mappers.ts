import type { ProfileData } from "../llm";
import type { ResumeData, ResumeSettings } from "../resumeGenerator";
import type { ProfileAggregate, JobApplication } from "../models";

/** ProfileAggregate -> the shape the AI generator expects. Replaces five copies. */
export function toAiProfile(agg: ProfileAggregate): ProfileData {
  const { profile } = agg;
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    headline: profile.headline,
    skills: profile.skills,
    experiences: agg.experiences.map((exp) => ({
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      responsibilities: exp.responsibilities,
    })),
    education: agg.education.map((edu) => ({
      school: edu.school,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate,
    })),
  };
}

function contactBlock(agg: ProfileAggregate): ResumeData["profile"] {
  const { profile } = agg;
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    linkedinUrl: profile.linkedinUrl ?? "",
    headline: profile.headline,
  };
}

function educationBlock(agg: ProfileAggregate): ResumeData["education"] {
  return agg.education.map((edu) => ({
    school: edu.school,
    degree: edu.degree,
    field: edu.field,
    startDate: edu.startDate,
    endDate: edu.endDate,
  }));
}

/** Render input for an AI-tailored application resume. */
export function toTailoredResumeData(
  agg: ProfileAggregate,
  application: JobApplication,
): ResumeData {
  const resume = (application.generatedResume ?? {}) as Record<string, unknown>;
  return {
    profile: contactBlock(agg),
    logline: (resume.logline as string[]) || [],
    experiences: (resume.experiences as ResumeData["experiences"]) || [],
    education: educationBlock(agg),
    technologies: (resume.technologies as string) || "",
    relevantSkills: (resume.relevantSkills as string[]) || [],
  };
}

/** Render input for an untailored dump of the raw profile. */
export function toProfileResumeData(agg: ProfileAggregate): ResumeData {
  return {
    profile: contactBlock(agg),
    logline: [],
    experiences: agg.experiences.map((exp) => ({
      company: exp.company,
      title: exp.title,
      location: exp.location,
      start: exp.startDate,
      end: exp.endDate,
      bullets: exp.responsibilities.split("\n").filter((b) => b.trim()),
    })),
    education: educationBlock(agg),
    technologies: agg.profile.skills,
    relevantSkills: agg.profile.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export const PROFILE_EXPORT_SETTINGS: ResumeSettings = {
  template: "modern",
  primaryColor: "#059669",
  fontFamily: "Inter",
  fontSize: "medium",
  sectionOrder: ["skills", "experience", "education"],
  sectionPreferences: {},
};

export function safeFilePart(value: string): string {
  return value.replace(/\s+/g, "_");
}
