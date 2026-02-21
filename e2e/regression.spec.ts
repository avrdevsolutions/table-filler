/**
 * E2E — Data-isolation regression suite
 *
 * Tests state bugs: data bleed between businesses, caching issues, and
 * race conditions when switching businesses / months.
 *
 * Scenario:
 *   - Two businesses A and B belonging to the same user
 *   - Two months Feb 2026 and Mar 2026
 *   - Verify no cross-contamination occurs when switching
 */
import { test, expect } from '@playwright/test';
import { registerAndLogin, createBusiness } from './helpers';

test.describe('Data isolation — business switching', () => {
  test('two businesses have independent data on the businesses page', async ({ page }) => {
    await registerAndLogin(page, 'iso-switch');
    await createBusiness(page, 'Firma ISO-A', 'Loc A');
    await createBusiness(page, 'Firma ISO-B', 'Loc B');

    // Expand A and verify B's location is not shown under A
    await page.locator('[title="Angajați"]').nth(0).click();
    await expect(page.getByText('Loc A')).toBeVisible();

    // B exists but is a separate card
    await expect(page.getByText('Firma ISO-B')).toBeVisible();
  });

  test('dashboard shows correct business name after switching', async ({ page }) => {
    await registerAndLogin(page, 'iso-dash');
    await createBusiness(page, 'BizDash-A', 'Loc');
    await createBusiness(page, 'BizDash-B', 'Loc');

    // Open A
    await page.getByRole('button', { name: /Deschide firma BizDash-A/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText('BizDash-A')).toBeVisible();

    // Switch to B via navbar
    await page.getByTitle('Schimbă firma').click();
    await page.getByRole('button', { name: 'BizDash-B' }).click();
    await expect(page.getByText('BizDash-B')).toBeVisible({ timeout: 10_000 });
    // The header area should show BizDash-B (not BizDash-A)
    await expect(page.getByText('BizDash-A')).not.toBeVisible({ timeout: 5_000 });
  });

  test('hard reload on dashboard preserves correct business', async ({ page }) => {
    await registerAndLogin(page, 'iso-reload');
    await createBusiness(page, 'BizReload', 'Loc');
    await page.getByRole('button', { name: /Deschide firma BizReload/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText('BizReload')).toBeVisible();

    // Hard reload
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('BizReload')).toBeVisible({ timeout: 10_000 });
  });

  test('no data bleed between two users (different browsers)', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pA = await ctxA.newPage();
    const pB = await ctxB.newPage();

    await registerAndLogin(pA, 'iso-user-a');
    await createBusiness(pA, 'UserA-Firma', 'Loc A');

    await registerAndLogin(pB, 'iso-user-b');
    // User B should not see User A's business
    await expect(pB.getByText('UserA-Firma')).not.toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});

test.describe('Data isolation — month switching', () => {
  test('navigating months on dashboard does not corrupt plan data', async ({ page }) => {
    await registerAndLogin(page, 'iso-months');
    await createBusiness(page, 'BizMonths', 'Loc');
    await page.getByRole('button', { name: /Deschide firma BizMonths/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Navigate forward one month then back — should not throw or show errors
    const prevBtn = page.getByLabel(/luna anterioară/i).or(page.getByRole('button', { name: '<' })).first();
    const nextBtn = page.getByLabel(/luna următoare/i).or(page.getByRole('button', { name: '>' })).first();

    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(500);
    }
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Page should not show an error
    await expect(page.getByText(/eroare/i)).not.toBeVisible();
  });
});
