"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  magicLinkSchema,
  passwordSignInSchema,
  type AuthActionResult,
  type MagicLinkInput,
  type PasswordSignInInput,
} from "@/lib/auth/schemas";

import { sendMagicLink, signInWithPassword } from "./actions";

type Mode = "password" | "magic-link";

const URL_ERRORS: Record<string, string> = {
  link_invalid: "That sign-in link is invalid or has expired. Request a new one.",
  no_profile:
    "Your sign-in worked, but this account has no profile in the app yet. An admin needs to finish setting it up.",
};

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const [mode, setMode] = useState<Mode>("password");
  const errorCode = searchParams.get("error") ?? "";
  const urlError = Object.hasOwn(URL_ERRORS, errorCode) ? URL_ERRORS[errorCode] : undefined;
  const [result, setResult] = useState<AuthActionResult | null>(urlError ? { ok: false, error: urlError } : null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setResult(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {mode === "password" ? (
        <PasswordForm next={next} onResult={setResult} />
      ) : (
        <MagicLinkForm next={next} onResult={setResult} />
      )}

      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}

      <Button
        type="button"
        variant="link"
        className="self-start px-0"
        onClick={() => switchMode(mode === "password" ? "magic-link" : "password")}
      >
        {mode === "password" ? "Email me a sign-in link instead" : "Sign in with a password instead"}
      </Button>
    </div>
  );
}

type FormProps = {
  next: string | undefined;
  onResult: (result: AuthActionResult | null) => void;
};

function PasswordForm({ next, onResult }: FormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PasswordSignInInput>({
    resolver: zodResolver(passwordSignInSchema),
    defaultValues: { email: "", password: "", next },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    onResult(null);
    startTransition(async () => {
      // On success the action redirects and never returns.
      onResult(await signInWithPassword(values));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <EmailField registration={form.register("email")} error={errors.email?.message} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...form.register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function MagicLinkForm({ next, onResult }: FormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "", next },
  });

  const onSubmit = form.handleSubmit((values) => {
    onResult(null);
    startTransition(async () => {
      onResult(await sendMagicLink(values));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <EmailField registration={form.register("email")} error={form.formState.errors.email?.message} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Email me a link"}
      </Button>
    </form>
  );
}

type EmailFieldProps = {
  registration: UseFormRegisterReturn<"email">;
  error: string | undefined;
};

function EmailField({ registration, error }: EmailFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "email-error" : undefined}
        {...registration}
      />
      {error && (
        <p id="email-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
