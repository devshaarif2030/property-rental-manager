import { ROLE_LABELS } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";

type RoleHomeProps = {
  user: CurrentUser;
  title: string;
  comingNext: string;
};

/** Placeholder home for each role until its real screens land. */
export function RoleHome({ user, title, comingNext }: RoleHomeProps) {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">Signed in as {user.fullName}. {comingNext}</p>
    </section>
  );
}
