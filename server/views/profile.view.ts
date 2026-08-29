import type { ProfileAggregate } from "../models";

const EMPTY_PROFILE = {
  id: null as string | null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  skills: "",
};

/**
 * The `/api/profile` response shape. Deliberately omits `userId` and
 * `linkedinUrl` and returns a blank shell (with `id: null`) when the user has
 * no profile yet — the client relies on both behaviours.
 */
export function serializeProfileResponse(aggregate: ProfileAggregate | null) {
  if (!aggregate) {
    return { profile: { ...EMPTY_PROFILE }, experiences: [], education: [] };
  }

  const { profile, experiences, education } = aggregate;
  return {
    profile: {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      headline: profile.headline,
      skills: profile.skills,
    },
    experiences: experiences.map((exp) => ({
      id: exp.id,
      company: exp.company,
      title: exp.title,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      responsibilities: exp.responsibilities,
    })),
    education: education.map((edu) => ({
      id: edu.id,
      school: edu.school,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate,
    })),
  };
}
