import { z } from "zod";

import { requiredText } from "@/lib/forms/fields";
import type { Database } from "@/lib/supabase/database.types";

export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type RequestCategory = Database["public"]["Enums"]["request_category"];
export type RequestPriority = Database["public"]["Enums"]["request_priority"];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  heating: "Heating",
  appliance: "Appliance",
  pest: "Pest",
  structural: "Structural",
  other: "Other",
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  emergency: "Emergency",
  high: "High",
  normal: "Normal",
  low: "Low",
};

/** Matches the length checks on maintenance_requests. */
export const newRequestSchema = z.object({
  title: requiredText("title", 120).min(3, { error: "Use at least 3 characters." }),
  description: requiredText("description", 4000),
});

export type NewRequestInput = z.input<typeof newRequestSchema>;

export const REQUEST_CATEGORIES = Object.keys(CATEGORY_LABELS) as RequestCategory[];
export const REQUEST_PRIORITIES = Object.keys(PRIORITY_LABELS) as RequestPriority[];

/** A manager confirms category and priority and picks a staff member, or nobody. */
export const triageSchema = z.object({
  category: z.enum(REQUEST_CATEGORIES, { error: "Choose a category." }),
  priority: z.enum(REQUEST_PRIORITIES, { error: "Choose a priority." }),
  assignedTo: z.union([z.guid(), z.literal("")]).transform((value) => (value === "" ? null : value)),
});

export type TriageInput = z.input<typeof triageSchema>;
export type TriageOutput = z.output<typeof triageSchema>;

/** The only moves staff can make; the database enforces the order. */
export const jobStatusSchema = z.object({
  status: z.enum(["in_progress", "done"]),
  note: z.string().trim().max(2000, { error: "Keep the note under 2000 characters." }),
});

export type JobStatusInput = z.input<typeof jobStatusSchema>;
