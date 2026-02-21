/**
 * E2E — Responsive smoke tests
 *
 * Runs the core auth + business creation flow at both desktop (1280×800) and
 * mobile (390×844) viewports to verify key elements are visible and tappable.
 */
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Desktop', width: 1280, height: 800 },
  { name: 'Mobile', width: 390, height: 844 },
];

for (const vp of viewports) {
  test.describe(`Responsive smoke — ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('login page renders correctly', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Parolă')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Intră în cont' })).toBeVisible();
    });

    test('register page renders correctly', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Parolă')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Creează cont' })).toBeVisible();
    });

    test('can register and view businesses page', async ({ page }) => {
      const email = `smoke-${vp.name.toLowerCase()}-${Date.now()}@test.invalid`;
      await page.goto('/register');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Parolă').fill('TestPass123!');
      await page.getByRole('button', { name: 'Creează cont' }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Parolă').fill('TestPass123!');
      await page.getByRole('button', { name: 'Intră în cont' }).click();
      await expect(page).toHaveURL(/\/businesses/, { timeout: 15_000 });

      // "Adaugă firmă" button must be visible and tappable
      const addBtn = page.getByRole('button', { name: /Adaugă firmă/i }).first();
      await expect(addBtn).toBeVisible();
      // Check the button is within the viewport (not hidden by overflow)
      const box = await addBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
    });
  });
}
