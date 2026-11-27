import { createClient } from "@/lib/supabase/server";

/**
 * Public health check. It runs one tiny query so the database sees activity;
 * a daily GitHub Actions job calls it to keep the free Supabase project from
 * pausing. Row level security still applies, so it reads no data for anyone.
 */
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").select("id").limit(1);
  const headers = { "Cache-Control": "no-store" };
  if (error) return Response.json({ ok: false }, { status: 503, headers });
  return Response.json({ ok: true }, { headers });
}
