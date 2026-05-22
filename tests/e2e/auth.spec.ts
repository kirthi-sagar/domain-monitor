// End-to-end happy path: signup → land on dashboard → add domain.
// Skipped unless E2E_RUN_DB=1 because it requires a real Supabase project with
// the migration applied. Locally, run:
//   E2E_RUN_DB=1 npx playwright test tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

const run = process.env.E2E_RUN_DB === "1";

test.describe("signup → dashboard → add domain", () => {
  test.skip(!run, "set E2E_RUN_DB=1 to run against a live Supabase");

  test("happy path", async ({ page }) => {
    const email = `e2e_${Date.now()}@example.com`;
    const password = "test-password-123";

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/domains/new");
    await page.getByLabel("Domain").fill("example.com");
    await page.getByRole("button", { name: "Add domain" }).click();
    await page.waitForURL(/\/domains\/[0-9a-f-]{36}$/);
    await expect(page.getByText("example.com")).toBeVisible();
  });
});
