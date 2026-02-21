/**
 * E2E — Plans / Table (schedule grid)
 *
 * Covers: opening a plan, empty state, month switching, business switching.
 */
import { test, expect } from '@playwright/test';
import { registerAndLogin, createBusiness } from './helpers';
import { MONTHS_RO } from '../src/lib/schedule';

/** Navigates to the dashboard for the first business. */
async function openDashboard(page: import('@playwright/test').Page, bizName: string) {
  await page.getByRole('button', { name: new RegExp(`Deschide firma ${bizName}`, 'i') }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe('Plans — Empty state', () => {
  test('dashboard shows empty state when no employees', async ({ page }) => {
    await registerAndLogin(page, 'plan-empty');
    await createBusiness(page, 'BizEmpty', 'Loc');
    await openDashboard(page, 'BizEmpty');
    // No employees yet → empty state message
    await expect(page.getByText(/Nu există date pentru luna selectată/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Plans — Month selector', () => {
  test('month selector is visible on dashboard', async ({ page }) => {
    await registerAndLogin(page, 'plan-month');
    await createBusiness(page, 'BizMonth', 'Loc');
    await openDashboard(page, 'BizMonth');
    // MonthSelector renders prev/next navigation
    await expect(page.getByRole('main')).toBeVisible();
    // Page title should contain the current month
    const now = new Date();
    const currentMonth = MONTHS_RO[now.getMonth()];
    await expect(page.getByText(new RegExp(currentMonth, 'i'))).toBeVisible();
  });
});

test.describe('Plans — Business switcher', () => {
  test('business switcher dropdown shows all user businesses', async ({ page }) => {
    await registerAndLogin(page, 'plan-switcher');
    await createBusiness(page, 'BizSwA', 'Loc');
    await createBusiness(page, 'BizSwB', 'Loc');
    await openDashboard(page, 'BizSwA');

    // Open the business switcher dropdown in the navbar
    await page.getByTitle('Schimbă firma').click();
    await expect(page.getByText('BizSwA')).toBeVisible();
    await expect(page.getByText('BizSwB')).toBeVisible();
  });

  test('switching business via dropdown reloads plan', async ({ page }) => {
    await registerAndLogin(page, 'plan-switch-biz');
    await createBusiness(page, 'BizSwitchFrom', 'Loc');
    await createBusiness(page, 'BizSwitchTo', 'Loc');
    await openDashboard(page, 'BizSwitchFrom');

    // Open switcher and click BizSwitchTo
    await page.getByTitle('Schimbă firma').click();
    await page.getByRole('button', { name: 'BizSwitchTo' }).click();

    // Nav should update to show BizSwitchTo
    await expect(page.getByText('BizSwitchTo')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Plans — Navigation to businesses', () => {
  test('home/back button returns to businesses page', async ({ page }) => {
    await registerAndLogin(page, 'plan-back');
    await createBusiness(page, 'BizNavBack', 'Loc');
    await openDashboard(page, 'BizNavBack');

    // Click "Gestionează firme" icon button
    await page.getByRole('button', { name: /Gestionează firme/i }).click();
    await expect(page).toHaveURL(/\/businesses/);
  });
});
