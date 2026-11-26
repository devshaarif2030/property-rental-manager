import { describe, expect, it, vi } from "vitest";

import { parseGeminiResponse, suggestWithGemini } from "./gemini";

const CONFIG = { apiKey: "test-key", model: "test-model" };
const REQUEST = { title: "Water through ceiling", description: "Dripping near the light fitting." };

function geminiBody(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

const GOOD = JSON.stringify({ category: "plumbing", priority: "emergency", reason: "Water near a light fitting." });

describe("parseGeminiResponse", () => {
  it("accepts a valid suggestion", () => {
    expect(parseGeminiResponse(geminiBody(GOOD))).toEqual({
      category: "plumbing",
      priority: "emergency",
      reason: "Water near a light fitting.",
    });
  });

  it("rejects values outside the enums", () => {
    const bad = JSON.stringify({ category: "roofing", priority: "emergency", reason: "x" });
    expect(parseGeminiResponse(geminiBody(bad))).toBeNull();
  });

  it("rejects an over-long reason", () => {
    const bad = JSON.stringify({ category: "other", priority: "low", reason: "x".repeat(201) });
    expect(parseGeminiResponse(geminiBody(bad))).toBeNull();
  });

  it("rejects text that is not JSON and bodies with no candidates", () => {
    expect(parseGeminiResponse(geminiBody("Sure! Here is the triage:"))).toBeNull();
    expect(parseGeminiResponse({ candidates: [] })).toBeNull();
    expect(parseGeminiResponse({ error: { code: 429 } })).toBeNull();
  });
});

describe("suggestWithGemini", () => {
  it("sends the key in a header, never in the URL", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(geminiBody(GOOD)), { status: 200 }));
    await suggestWithGemini(REQUEST, CONFIG, fetchMock as unknown as typeof fetch);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });

  it("returns the suggestion on success", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(geminiBody(GOOD)), { status: 200 }));
    expect(await suggestWithGemini(REQUEST, CONFIG, fetchMock as unknown as typeof fetch)).toMatchObject({
      category: "plumbing",
    });
  });

  it("returns null on an HTTP error such as a rate limit", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 429 }));
    expect(await suggestWithGemini(REQUEST, CONFIG, fetchMock as unknown as typeof fetch)).toBeNull();
  });

  it("returns null when the network fails or times out", async () => {
    const fetchMock = vi.fn(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    expect(await suggestWithGemini(REQUEST, CONFIG, fetchMock as unknown as typeof fetch)).toBeNull();
  });
});
