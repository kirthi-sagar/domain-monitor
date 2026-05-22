import { test, expect } from "@playwright/test";

test("landing renders hero + nav", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Don't lose another/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start free/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Read the docs/ })).toBeVisible();
});

test("pricing page lists three plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: /Free/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Pro/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Business/ })).toBeVisible();
});

test("login page renders form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
