import { expect, type Page } from "@playwright/test";

import { ROLE_LABELS } from "@/lib/auth/roles";
import type { DemoRole } from "@/lib/demo/roles";

const HOME_BY_ROLE: Record<DemoRole, RegExp> = {
  manager: /\/manager$/,
  tenant: /\/tenant$/,
  staff: /\/staff$/,
};

/** Signs in with the one-click demo button, the same way a visitor does. */
export async function signInAsDemo(page: Page, role: DemoRole) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: `Try as ${ROLE_LABELS[role].toLowerCase()}` }).click();
  await expect(page).toHaveURL(HOME_BY_ROLE[role]);
}
