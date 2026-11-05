import {
  generateTailoredResume,
  generateCoverLetter,
  evaluateResumeRanking,
  analyzeJobFitGap,
} from "../llm";
import type { AiPort } from "./types";

/** Binds the concrete LLM functions to the AiPort interface. */
export function createAiAdapter(): AiPort {
  return {
    generateResume: generateTailoredResume,
    generateCoverLetter,
    evaluateResumeRanking,
    analyzeJobFitGap,
  };
}
