import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/layout/auth-shell";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { acceptInviteSchema } from "@/lib/invites/schemas";
import { hashInviteToken } from "@/lib/invites/tokens";

import { AcceptInviteForm } from "./accept-invite-form";
import { findOpenInvite } from "./invite";

export const metadata: Metadata = {
  title: "Accept invite · Property Rental Manager",
  robots: { index: false },
};

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <AuthShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Checking your invite...</p>}>
        <InviteDetails params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function InviteDetails({ params }: Pick<PageProps<"/invite/[token]">, "params">) {
  const { token } = await params;
  const tokenIsWellFormed = acceptInviteSchema.shape.token.safeParse(token).success;
  const invite = tokenIsWellFormed ? await findOpenInvite(hashInviteToken(token)) : null;

  if (!invite) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Invite not valid</h1>
        <p className="text-sm text-muted-foreground">
          This link has expired, was revoked or was already used. Ask your property manager for a
          new invite, or <Link href={SIGN_IN_PATH} className="underline">sign in</Link> if you
          already have an account.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Join {invite.organizationName}</h1>
        <p className="text-sm text-muted-foreground">
          You are invited as <span className="font-medium text-foreground">{ROLE_LABELS[invite.role]}</span>.
          Set your name and password to finish.
        </p>
      </div>
      <AcceptInviteForm token={token} email={invite.email} />
    </>
  );
}
