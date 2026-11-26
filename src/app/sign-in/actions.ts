"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { homePathForRole, safeNextPath, SIGN_IN_PATH } from "@/lib/auth/paths";
import {
  magicLinkSchema,
  passwordSignInSchema,
  type AuthActionResult,
  type MagicLinkInput,
  type PasswordSignInInput,
} from "@/lib/auth/schemas";
import { demoRoleSchema } from "@/lib/demo/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const INVALID_INPUT = "Check the highlighted fields and try again.";
const NO_PROFILE_ERROR =
  "Your sign-in worked, but this account has no profile in the app yet. An admin needs to finish setting it up.";

export async function signInWithPassword(input: PasswordSignInInput): Promise<AuthActionResult> {
  const parsed = passwordSignInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // One message for every failure, so the form does not reveal which emails exist.
  if (error) return { ok: false, error: "Email or password is incorrect." };

  // Without a profile every page would send the user back here, so say why
  // instead of looping. The password was right, so this reveals nothing new.
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: NO_PROFILE_ERROR };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function sendMagicLink(input: MagicLinkInput): Promise<AuthActionResult> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID_INPUT };

  const origin = (await headers()).get("origin");
  if (!origin) return { ok: false, error: "Could not send the link. Try again." };

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", safeNextPath(parsed.data.next));

  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Accounts are created by invite only.
      shouldCreateUser: false,
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  // Same answer whether or not the email has an account.
  return { ok: true, message: "If that email has an account, a sign-in link is on its way." };
}

const DEMO_UNAVAILABLE = "The demo login is not available right now. Try again later.";

/**
 * One-click sign in as a shared demo account. The server looks up the account
 * for the role, creates a one-time sign-in token with the service role and
 * exchanges it for a session cookie straight away. No password is shown,
 * stored or sent, and no email goes out.
 */
export async function signInAsDemo(role: unknown): Promise<AuthActionResult> {
  const parsed = demoRoleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: DEMO_UNAVAILABLE };

  const admin = createAdminClient();
  const { data: email, error: lookupError } = await admin.rpc("demo_account_email", { p_role: parsed.data });
  if (lookupError || !email) return { ok: false, error: DEMO_UNAVAILABLE };

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) return { ok: false, error: DEMO_UNAVAILABLE };

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) return { ok: false, error: DEMO_UNAVAILABLE };

  redirect(homePathForRole(parsed.data));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}
