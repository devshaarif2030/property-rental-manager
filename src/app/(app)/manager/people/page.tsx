import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
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
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <InviteForm invitableRoles={rolesInvitableBy(user.role)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pending invites</h2>
        {invites.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {invites.data.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
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
        <ul className="divide-y rounded-md border">
          {members.data.map((member) => (
            <li key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{member.full_name}</span>
              <span className="text-muted-foreground">{ROLE_LABELS[member.role]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
