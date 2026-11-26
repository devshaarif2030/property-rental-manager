import { test, type Page } from "@playwright/test";

import { signInAsDemo } from "./demo";

// README and review screenshots, not assertions. Run with: pnpm screenshots
// They land in screenshots/ (git-ignored); CI uploads them as an artifact.

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function capture(page: Page, name: string, fullPage = true) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage });
}

test.describe("@screenshots", () => {
  // Reduced motion captures each page in its final state, not mid-animation.
  test.use({ viewport: DESKTOP, deviceScaleFactor: 2, contextOptions: { reducedMotion: "reduce" } });

  test("public pages", async ({ page }) => {
    await page.goto("/");
    await capture(page, "landing", false);
    await capture(page, "landing-full");
    await page.goto("/sign-in");
    await capture(page, "sign-in", false);
  });

  test("manager", async ({ page }) => {
    await signInAsDemo(page, "manager");
    await capture(page, "manager-dashboard");
    await page.goto("/manager/properties");
    await capture(page, "manager-properties");
    await page.goto("/manager/maintenance");
    await capture(page, "manager-maintenance");
    await page.getByRole("link", { name: /Bedroom radiator stays cold/ }).click();
    await capture(page, "manager-triage");
    await page.goto("/manager/people");
    await capture(page, "manager-people");
  });

  test("tenant", async ({ page }) => {
    await signInAsDemo(page, "tenant");
    await capture(page, "tenant-home");
    await page.goto("/tenant/requests/new");
    await capture(page, "tenant-report");
  });

  test("staff", async ({ page }) => {
    await signInAsDemo(page, "staff");
    await capture(page, "staff-jobs");
    await page.getByRole("link", { name: /Hallway light flickering/ }).click();
    await capture(page, "staff-job");
  });

  test.describe("phone", () => {
    test.use({ viewport: PHONE, deviceScaleFactor: 2 });

    test("landing", async ({ page }) => {
      await page.goto("/");
      await capture(page, "phone-landing", false);
    });

    test("manager", async ({ page }) => {
      await signInAsDemo(page, "manager");
      await capture(page, "phone-manager-dashboard", false);
    });

    test("tenant", async ({ page }) => {
      await signInAsDemo(page, "tenant");
      await capture(page, "phone-tenant-home", false);
    });
  });
});
