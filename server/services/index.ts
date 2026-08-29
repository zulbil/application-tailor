import type { Repositories } from "../repositories/types";
import type { AiPort, DocumentPort } from "./types";
import { ProfileService } from "./profile.service";
import { ApplicationService } from "./application.service";
import { GenerationService } from "./generation.service";
import { ExportService } from "./export.service";
import { ChallengeService } from "./challenge.service";

export type { AiPort, DocumentPort, GeneratedResume, ResumeCatalog } from "./types";
export { ProfileService } from "./profile.service";
export { ApplicationService } from "./application.service";
export { GenerationService } from "./generation.service";
export { ExportService } from "./export.service";
export { ChallengeService } from "./challenge.service";

export interface Services {
  profile: ProfileService;
  application: ApplicationService;
  generation: GenerationService;
  export: ExportService;
  challenge: ChallengeService;
}

export interface ServiceDependencies {
  repositories: Repositories;
  ai: AiPort;
  documents: DocumentPort;
}

export function createServices({ repositories, ai, documents }: ServiceDependencies): Services {
  const application = new ApplicationService(repositories.profiles, repositories.applications);

  return {
    profile: new ProfileService(repositories.profiles),
    application,
    generation: new GenerationService(
      repositories.profiles,
      repositories.applications,
      application,
      ai,
    ),
    export: new ExportService(repositories.profiles, application, documents),
    challenge: new ChallengeService(
      repositories.profiles,
      repositories.applications,
      repositories.challenges,
    ),
  };
}
