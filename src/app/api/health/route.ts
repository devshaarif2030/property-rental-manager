import { connection } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public health check. It runs one tiny query so the database sees activity;
 * a daily GitHub Actions job calls it to keep the free Supabase project from
 * pausing. The anon role has no table grants, so this uses the server-only
 * client, asks for a row count with no rows (head: true), and returns only
 * ok or not. No data leaves the server.
 */
export async function GET() {
  await connection();
  const { error } = await createAdminClient()
    .from("organizations")
    .select("id", { count: "exact", head: true });
  const headers = { "Cache-Control": "no-store" };
  if (error) return Response.json({ ok: false }, { status: 503, headers });
  return Response.json({ ok: true }, { headers });
}
