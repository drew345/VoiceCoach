import { EN_PROMPTS } from "./prompts-en";
import { KO_PROMPTS } from "./prompts-ko";

export type PromptLanguage = "en" | "ko";
export type PromptMode = "english" | "korean" | "mixed";

export type PromptItem = {
  id: string;
  language: PromptLanguage;
  text: string;
};

// Local-only toggle: set this to false if you ever want to exclude Korean prompts
// from a more public build without deleting the file.
const INCLUDE_KOREAN_PROMPTS = true;

// Personal default for this device/build. Change to "english" for an English-only pool.
const PROMPT_MODE: PromptMode = INCLUDE_KOREAN_PROMPTS ? "mixed" : "english";

export function buildPromptPool(mode: PromptMode): PromptItem[] {
  switch (mode) {
    case "english":
      return EN_PROMPTS;
    case "korean":
      return KO_PROMPTS;
    case "mixed":
    default:
      return INCLUDE_KOREAN_PROMPTS ? [...EN_PROMPTS, ...KO_PROMPTS] : EN_PROMPTS;
  }
}

export const PROMPTS: PromptItem[] = buildPromptPool(PROMPT_MODE);
