import { describe, expect, it } from "vitest";

import { jobStatusSchema, newRequestSchema, triageSchema } from "./requests";

const STAFF_ID = "10000000-0000-0000-0000-0000000000a4";

describe("newRequestSchema", () => {
  it("trims and accepts a normal report", () => {
    expect(newRequestSchema.parse({ title: "  Leaking tap ", description: " Drips all night " })).toEqual({
      title: "Leaking tap",
      description: "Drips all night",
    });
  });

  it("needs a title of at least 3 characters and a description", () => {
    expect(newRequestSchema.safeParse({ title: "ab", description: "x" }).success).toBe(false);
    expect(newRequestSchema.safeParse({ title: "Leak", description: "   " }).success).toBe(false);
  });
});

describe("triageSchema", () => {
  it("turns an empty assignee into null", () => {
    expect(triageSchema.parse({ category: "plumbing", priority: "high", assignedTo: "" })).toEqual({
      category: "plumbing",
      priority: "high",
      assignedTo: null,
    });
  });

  it("keeps a staff id", () => {
    expect(triageSchema.parse({ category: "heating", priority: "low", assignedTo: STAFF_ID }).assignedTo).toBe(STAFF_ID);
  });

  it("rejects unknown values", () => {
    expect(triageSchema.safeParse({ category: "roof", priority: "high", assignedTo: "" }).success).toBe(false);
    expect(triageSchema.safeParse({ category: "other", priority: "urgent", assignedTo: "" }).success).toBe(false);
    expect(triageSchema.safeParse({ category: "other", priority: "low", assignedTo: "bob" }).success).toBe(false);
  });
});

describe("jobStatusSchema", () => {
  it("allows only in progress and done", () => {
    expect(jobStatusSchema.safeParse({ status: "in_progress", note: "" }).success).toBe(true);
    expect(jobStatusSchema.safeParse({ status: "done", note: "Fixed" }).success).toBe(true);
    expect(jobStatusSchema.safeParse({ status: "cancelled", note: "" }).success).toBe(false);
    expect(jobStatusSchema.safeParse({ status: "assigned", note: "" }).success).toBe(false);
  });

  it("caps the note", () => {
    expect(jobStatusSchema.safeParse({ status: "done", note: "x".repeat(2001) }).success).toBe(false);
  });
});
