import { describe, expect, it } from "vitest";

import { triageByRules } from "./rules";

describe("triageByRules", () => {
  it("spots a ceiling leak as urgent plumbing", () => {
    const result = triageByRules({ title: "Water leaking through ceiling", description: "Dripping onto the floor." });
    expect(result).toMatchObject({ category: "plumbing", priority: "high" });
  });

  it("treats gas and smoke as emergencies", () => {
    expect(triageByRules({ title: "Smell of gas", description: "In the kitchen near the cooker." }).priority).toBe("emergency");
    expect(triageByRules({ title: "Socket sparking", description: "Smoke from the outlet." })).toMatchObject({
      category: "electrical",
      priority: "emergency",
    });
  });

  it("files a boiler fault under heating", () => {
    expect(triageByRules({ title: "Boiler not starting", description: "No hot water since Monday." })).toMatchObject({
      category: "heating",
      priority: "high",
    });
  });

  it("finds pests and appliances", () => {
    expect(triageByRules({ title: "Mice in the cupboard", description: "Droppings everywhere." }).category).toBe("pest");
    expect(triageByRules({ title: "Fridge is warm", description: "Stopped cooling." }).category).toBe("appliance");
  });

  it("marks cosmetic jobs low", () => {
    expect(triageByRules({ title: "Paint scuff on hallway", description: "Cosmetic only." }).priority).toBe("low");
  });

  it("falls back to other and normal", () => {
    expect(triageByRules({ title: "Question about bins", description: "Which day is collection?" })).toMatchObject({
      category: "other",
      priority: "normal",
    });
  });

  it("matches whole words only", () => {
    // "tapestry" must not count as "tap", "firework" must not count as "fire".
    expect(triageByRules({ title: "Tapestry hook", description: "Firework poster fell" })).toMatchObject({
      category: "other",
      priority: "normal",
    });
  });

  it("explains itself within the stored length", () => {
    const { reason } = triageByRules({ title: "Leak", description: "Gas smell too" });
    expect(reason.startsWith("Keyword rules:")).toBe(true);
    expect(reason.length).toBeLessThanOrEqual(200);
  });
});
