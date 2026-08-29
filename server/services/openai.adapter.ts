import {
  generateTailoredResume,
  generateCoverLetter,
  evaluateResumeRanking,
  analyzeJobFitGap,
} from "../openai";
import type { AiPort } from "./types";

/** Binds the concrete OpenAI functions to the AiPort interface. */
export function createOpenAiAdapter(): AiPort {
  return {
    generateResume: generateTailoredResume,
    generateCoverLetter,
    evaluateResumeRanking,
    analyzeJobFitGap,
  };
}
