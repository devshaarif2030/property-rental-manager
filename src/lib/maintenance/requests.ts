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
