import { describe, expect, it, vi } from "vitest";

import { suggestTriage } from "./suggest";

const REQUEST = { title: "Smell of gas in kitchen", description: "Strong smell near the cooker." };
const GEMINI = { apiKey: "test-key", model: "test-model" };

function geminiReturning(text: string, status = 200) {
  return vi.fn(
    async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status }),
  ) as unknown as typeof fetch;
}

const AI_JSON = JSON.stringify({ category: "appliance", priority: "emergency", reason: "Gas smell at the cooker." });

describe("suggestTriage", () => {
  it("uses Gemini when it answers well", async () => {
    const result = await suggestTriage(REQUEST, { gemini: GEMINI, aiAllowed: true, fetchImpl: geminiReturning(AI_JSON) });
    expect(result).toEqual({ category: "appliance", priority: "emergency", reason: "Gas smell at the cooker.", source: "ai" });
  });

  it("falls back to rules when Gemini returns junk", async () => {
    const result = await suggestTriage(REQUEST, { gemini: GEMINI, aiAllowed: true, fetchImpl: geminiReturning("oops") });
    expect(result).toMatchObject({ priority: "emergency", source: "rules" });
  });

  it("falls back to rules when Gemini is down", async () => {
    const result = await suggestTriage(REQUEST, {
      gemini: GEMINI,
      aiAllowed: true,
      fetchImpl: geminiReturning(AI_JSON, 503),
    });
    expect(result.source).toBe("rules");
  });

  it("does not call Gemini without a key or over the limit", async () => {
    const fetchImpl = geminiReturning(AI_JSON);
    expect((await suggestTriage(REQUEST, { gemini: null, aiAllowed: true, fetchImpl })).source).toBe("rules");
    expect((await suggestTriage(REQUEST, { gemini: GEMINI, aiAllowed: false, fetchImpl })).source).toBe("rules");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
