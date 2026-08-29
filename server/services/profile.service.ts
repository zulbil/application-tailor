import type { ProfileRepository } from "../repositories/types";
import type {
  ProfileAggregate,
  InsertProfile,
  InsertExperience,
  InsertEducation,
} from "../models";

export class ProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  getProfile(userId: string): Promise<ProfileAggregate | null> {
    return this.profiles.findAggregateByUserId(userId);
  }

  saveProfile(
    userId: string,
    input: {
      profile: InsertProfile;
      experiences: InsertExperience[];
      education: InsertEducation[];
    },
  ): Promise<ProfileAggregate> {
    return this.profiles.save(userId, input.profile, input.experiences, input.education);
  }
}
