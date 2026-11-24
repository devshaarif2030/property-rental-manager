import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSignInSchema = z.object({
  email,
  password: z.string().min(8, { error: "Password must be at least 8 characters." }).max(72),
  next: z.string().optional(),
});

export const magicLinkSchema = z.object({
  email,
  next: z.string().optional(),
});

export type PasswordSignInInput = z.input<typeof passwordSignInSchema>;
export type MagicLinkInput = z.input<typeof magicLinkSchema>;

/** Result returned by auth server actions to the form. */
export type AuthActionResult = { ok: true; message?: string } | { ok: false; error: string };
