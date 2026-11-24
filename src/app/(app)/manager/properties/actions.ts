"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import {
  idSchema,
  propertySchema,
  unitSchema,
  type FormActionResult,
  type PropertyInput,
  type UnitInput,
} from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

const PROPERTIES_PATH = "/manager/properties";
const MANAGER_ROLES = ["admin", "manager"] as const;

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

const INVALID_INPUT: FormActionResult = { ok: false, error: "Check the highlighted fields and try again." };
const NOT_FOUND: FormActionResult = { ok: false, error: "That record no longer exists." };

function writeError(error: PostgrestError, messages: Partial<Record<string, string>>): FormActionResult {
  return { ok: false, error: messages[error.code] ?? "Something went wrong. Try again." };
}

function propertyPath(propertyId: string): string {
  return `${PROPERTIES_PATH}/${propertyId}`;
}

// Every action re-checks the role here, and runs as the signed-in user so RLS
// checks the organization again in the database.

export async function createProperty(input: PropertyInput): Promise<FormActionResult> {
  const user = await requireRole(MANAGER_ROLES, `${PROPERTIES_PATH}/new`);
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      org_id: user.orgId,
      name: parsed.data.name,
      address_line: parsed.data.addressLine,
      city: parsed.data.city,
      postcode: parsed.data.postcode,
      country: parsed.data.country,
      manager_id: user.id,
    })
    .select("id")
    .single();
  if (error) return writeError(error, {});

  revalidatePath(PROPERTIES_PATH);
  redirect(propertyPath(data.id));
}

export async function updateProperty(propertyId: string, input: PropertyInput): Promise<FormActionResult> {
  await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(propertyId);
  const parsed = propertySchema.safeParse(input);
  if (!id.success || !parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update({
      name: parsed.data.name,
      address_line: parsed.data.addressLine,
      city: parsed.data.city,
      postcode: parsed.data.postcode,
      country: parsed.data.country,
    })
    .eq("id", id.data)
    .select("id");
  if (error) return writeError(error, {});
  if (data.length === 0) return NOT_FOUND;

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(propertyPath(id.data));
}

export async function deleteProperty(propertyId: string): Promise<FormActionResult> {
  await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(propertyId);
  if (!id.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").delete().eq("id", id.data).select("id");
  if (error) {
    return writeError(error, {
      [FOREIGN_KEY_VIOLATION]: "This property has units with leases or requests. End those first.",
    });
  }
  if (data.length === 0) return NOT_FOUND;

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(PROPERTIES_PATH);
}

const DUPLICATE_UNIT_LABEL = "A unit with that label already exists in this property.";

export async function createUnit(propertyId: string, input: UnitInput): Promise<FormActionResult> {
  const user = await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(propertyId);
  const parsed = unitSchema.safeParse(input);
  if (!id.success || !parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { error } = await supabase.from("units").insert({
    org_id: user.orgId,
    property_id: id.data,
    label: parsed.data.label,
    bedrooms: parsed.data.bedrooms,
    bathrooms: parsed.data.bathrooms,
    rent_amount_cents: parsed.data.rent,
  });
  if (error) {
    return writeError(error, {
      [UNIQUE_VIOLATION]: DUPLICATE_UNIT_LABEL,
      [FOREIGN_KEY_VIOLATION]: NOT_FOUND.error,
    });
  }

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(propertyPath(id.data));
}

export async function updateUnit(unitId: string, input: UnitInput): Promise<FormActionResult> {
  await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(unitId);
  const parsed = unitSchema.safeParse(input);
  if (!id.success || !parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .update({
      label: parsed.data.label,
      bedrooms: parsed.data.bedrooms,
      bathrooms: parsed.data.bathrooms,
      rent_amount_cents: parsed.data.rent,
    })
    .eq("id", id.data)
    .select("property_id");
  if (error) return writeError(error, { [UNIQUE_VIOLATION]: DUPLICATE_UNIT_LABEL });
  if (data.length === 0) return NOT_FOUND;

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(propertyPath(data[0].property_id));
}

export async function deleteUnit(unitId: string): Promise<FormActionResult> {
  await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(unitId);
  if (!id.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase.from("units").delete().eq("id", id.data).select("property_id");
  if (error) {
    return writeError(error, {
      [FOREIGN_KEY_VIOLATION]: "This unit has a lease or maintenance requests, so it cannot be deleted.",
    });
  }
  if (data.length === 0) return NOT_FOUND;

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(propertyPath(data[0].property_id));
}
