import type { Metadata } from "next";

import { MailOpen } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { initials } from "@/lib/names";
import { rolesInvitableBy } from "@/lib/invites/schemas";
import { createClient } from "@/lib/supabase/server";

import { revokeInvite } from "./actions";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "People · Property Rental Manager" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export default async function PeoplePage() {
  const user = await requireRole(["admin", "manager"], "/manager/people");
  const supabase = await createClient();

  const [members, invites] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    supabase
      .from("invites")
      .select("id, email, role, expires_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  if (members.error) throw members.error;
  if (invites.error) throw invites.error;
  const now = new Date();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Property manager"
          title="People"
          description="Invite tenants and maintenance staff. Accounts are invite only."
        />
        <InviteForm invitableRoles={rolesInvitableBy(user.role)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pending invites</h2>
        {invites.data.length === 0 ? (
          <EmptyState icon={MailOpen} title="No pending invites" description="Invites you send show here until accepted." />
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
            {invites.data.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-muted-foreground">
                    {ROLE_LABELS[invite.role]} ·{" "}
                    {new Date(invite.expires_at) <= now
                      ? "expired, revoke to invite again"
                      : `expires ${dateFormat.format(new Date(invite.expires_at))}`}
                  </p>
                </div>
                <form action={revokeInvite}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Revoke
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          {members.data.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-brand-800"
                >
                  {initials(member.full_name)}
                </span>
                <span className="font-semibold">{member.full_name}</span>
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {ROLE_LABELS[member.role]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
