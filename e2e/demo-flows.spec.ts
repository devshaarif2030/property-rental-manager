import { expect, test, type Browser } from "@playwright/test";

import { formatIsoMonth } from "@/lib/dates";

import { createPendingPayment, demoTenantUnpaidCharge, signedCheckoutCompleted } from "./admin";
import { signInAsDemo } from "./demo";

// The three demo flows, end to end, on local Supabase with the demo data:
// a tenant reports a repair, the manager triages it, staff work the job, and
// the tenant's rent is paid through the verified Stripe webhook.

test.describe.configure({ mode: "serial" });

const title = `Bathroom tap leaking (e2e ${Date.now()})`;
let requestPath = "";

async function pageAs(browser: Browser, role: "manager" | "tenant" | "staff") {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAsDemo(page, role);
  return page;
}

test("tenant reports a repair", async ({ browser }) => {
  const page = await pageAs(browser, "tenant");
  await page.getByRole("main").getByRole("link", { name: "Report a problem" }).click();
  await page.getByLabel("What is the problem?").fill(title);
  await page.getByLabel("Details").fill("The cold tap under the bathroom sink drips all night and the cabinet is wet.");
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page).toHaveURL(/\/tenant\/requests\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
  requestPath = new URL(page.url()).pathname;
});

test("manager triages it and assigns staff", async ({ browser }) => {
  const requestId = requestPath.split("/").pop();
  const page = await pageAs(browser, "manager");
  await page.goto(`/manager/maintenance/${requestId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByLabel("Category").selectOption({ label: "Plumbing" });
  await page.getByLabel("Priority").selectOption({ label: "High" });
  await page.getByLabel("Assign to").selectOption({ label: "Sam Staff" });
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
});

test("staff start and finish the job", async ({ browser }) => {
  const page = await pageAs(browser, "staff");
  await page.getByRole("link", { name: new RegExp(title.replace(/[()]/g, "\\$&")) }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByLabel("Note for the timeline (optional)").fill("Coming round at 10 tomorrow.");
  await page.getByRole("button", { name: "Start job" }).click();
  await expect(page.getByText("Coming round at 10 tomorrow.")).toBeVisible();

  // Wait for the form to reset for the next step before typing the next note.
  const note = page.getByLabel("Note for the timeline (optional)");
  await expect(page.getByRole("button", { name: "Mark as done" })).toBeVisible();
  await expect(note).toHaveValue("");
  await note.fill("Replaced the washer, no more drip.");
  await page.getByRole("button", { name: "Mark as done" }).click();
  await expect(page.getByText("Replaced the washer, no more drip.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as done" })).toBeHidden();
});

test("tenant sees the job done", async ({ browser }) => {
  const page = await pageAs(browser, "tenant");
  await page.goto(requestPath);
  await expect(page.getByText("Done", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Replaced the washer, no more drip.")).toBeVisible();
});

test("rent is only marked paid by a verified webhook", async ({ browser, request }) => {
  const charge = await demoTenantUnpaidCharge();
  const sessionId = await createPendingPayment(charge);
  const event = signedCheckoutCompleted({ id: sessionId, amountCents: charge.amount_cents, currency: charge.currency });

  // A forged event without a valid signature is refused and changes nothing.
  const forged = await request.post("/api/stripe/webhook", {
    data: event.payload,
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=forged" },
  });
  expect(forged.status()).toBe(400);

  const page = await pageAs(browser, "tenant");
  const month = formatIsoMonth(charge.period_month);
  await expect(page.getByRole("button", { name: "Pay now" })).toBeVisible();

  const signed = await request.post("/api/stripe/webhook", {
    data: event.payload,
    headers: { "content-type": "application/json", "stripe-signature": event.signature },
  });
  expect(signed.status()).toBe(200);

  await page.reload();
  await expect(page.getByText("You are all paid up")).toBeVisible();
  await expect(page.getByText(`Rent, ${month}`)).toBeVisible();
  await page.getByRole("link", { name: "Receipt" }).first().click();
  await expect(page.getByRole("heading", { name: "Rent paid" })).toBeVisible();
});
