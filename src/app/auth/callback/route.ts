import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath, SIGN_IN_PATH } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

/** Magic link landing: swaps the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=link_invalid`, origin));
}
