import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { isProtectedPath, signInPathFor } from "@/lib/auth/paths";

import type { Database } from "./database.types";

/**
 * Refreshes the Supabase session cookies on every request and sends signed-out
 * visitors on protected paths to the sign-in page. This is an optimistic check
 * only: pages and server actions re-check the user and role, and RLS has the
 * final say.
 */
export async function updateSession(request: NextRequest) {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims: getClaims
  // refreshes an expired session and writes the new cookies.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims.sub);

  const { pathname, search } = request.nextUrl;
  if (!isSignedIn && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(new URL(signInPathFor(pathname + search), request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
