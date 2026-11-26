import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { PHOTO_URL_SECONDS, REQUEST_PHOTOS_BUCKET } from "./photos";
import type { RequestCategory, RequestPriority, RequestStatus } from "./requests";

type Client = SupabaseClient<Database>;

// Queries run as the signed-in user. RLS decides which requests come back:
// tenants get their own, staff their assigned jobs, managers the whole org.

export type RequestSummary = {
  id: string;
  title: string;
  status: RequestStatus;
  category: RequestCategory | null;
  priority: RequestPriority | null;
  createdAt: string;
  unitLabel: string;
  propertyName: string;
};

export async function listRequests(supabase: Client, limit = 50): Promise<RequestSummary[]> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("id, title, status, category, priority, created_at, units(label, properties(name))")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map((request) => ({
    id: request.id,
    title: request.title,
    status: request.status,
    category: request.category,
    priority: request.priority,
    createdAt: request.created_at,
    unitLabel: request.units.label,
    propertyName: request.units.properties.name,
  }));
}

export type RequestPhoto = { id: string; url: string };

export type RequestUpdate = {
  id: string;
  status: RequestStatus | null;
  note: string | null;
  createdAt: string;
  /** Null when the caller cannot see the author's profile (a tenant reading a staff note). */
  authorName: string | null;
};

export type RequestDetail = RequestSummary & {
  description: string;
  aiCategory: RequestCategory | null;
  aiPriority: RequestPriority | null;
  aiReason: string | null;
  tenantName: string | null;
  photos: RequestPhoto[];
  updates: RequestUpdate[];
};

export async function getRequestDetail(supabase: Client, requestId: string): Promise<RequestDetail | null> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select(
      `id, title, description, status, category, priority, ai_category, ai_priority, ai_reason, created_at,
       units(label, properties(name)),
       tenant:profiles!maintenance_requests_org_id_tenant_id_fkey(full_name),
       request_photos(id, storage_path, created_at),
       request_updates(id, status, note, created_at, author:profiles!request_updates_org_id_author_id_fkey(full_name))`,
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const photoRows = [...data.request_photos].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let photos: RequestPhoto[] = [];
  if (photoRows.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(REQUEST_PHOTOS_BUCKET)
      .createSignedUrls(
        photoRows.map((photo) => photo.storage_path),
        PHOTO_URL_SECONDS,
      );
    if (signError) throw signError;
    photos = photoRows.flatMap((photo, index) => {
      const url = signed[index]?.signedUrl;
      return url ? [{ id: photo.id, url }] : [];
    });
  }

  const updates = [...data.request_updates]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((update) => ({
      id: update.id,
      status: update.status,
      note: update.note,
      createdAt: update.created_at,
      authorName: update.author?.full_name ?? null,
    }));

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    category: data.category,
    priority: data.priority,
    aiCategory: data.ai_category,
    aiPriority: data.ai_priority,
    aiReason: data.ai_reason,
    createdAt: data.created_at,
    unitLabel: data.units.label,
    propertyName: data.units.properties.name,
    tenantName: data.tenant?.full_name ?? null,
    photos,
    updates,
  };
}
