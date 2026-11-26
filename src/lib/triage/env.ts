import "server-only";

import { z } from "zod";

import { DEFAULT_GEMINI_MODEL, type GeminiConfig } from "./gemini";

const triageEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default(DEFAULT_GEMINI_MODEL),
});

/** Gemini settings, or null when no key is set: the app then triages with the keyword rules only. */
export function getGeminiConfig(): GeminiConfig | null {
  const env = triageEnvSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: process.env.GEMINI_MODEL || undefined,
  });
  return env.GEMINI_API_KEY ? { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL } : null;
}
