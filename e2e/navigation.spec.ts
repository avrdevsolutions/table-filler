/**
 * E2E — Navigation & routing
 *
 * Covers: guarded routes, back navigation, direct URL access.
 */
import { test, expect } from '@playwright/test';
import { registerAndLogin, createBusiness } from './helpers';

test.describe('Navigation — Guarded routes', () => {
  test('unauthenticated user is redirected to /login from /businesses', async ({ page }) => {
    await page.goto('/businesses');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user is redirected to /login from /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('root / redirects appropriately', async ({ page }) => {
    await page.goto('/');
    // Root may redirect to /login or /businesses depending on auth state
    const url = page.url();
    expect(url).toMatch(/\/(login|businesses)/);
  });
});

test.describe('Navigation — Back navigation', () => {
  test('businesses → dashboard → businesses (back button)', async ({ page }) => {
    await registerAndLogin(page, 'nav-back');
    await createBusiness(page, 'BizNavBackBtn', 'Loc');

    // Go to dashboard
    await page.getByRole('button', { name: /Deschide firma BizNavBackBtn/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Go back via browser history
    await page.goBack();
    await expect(page).toHaveURL(/\/businesses/);
  });

  test('dashboard → businesses via Gestionează firme button', async ({ page }) => {
    await registerAndLogin(page, 'nav-mgmt');
    await createBusiness(page, 'BizNavMgmt', 'Loc');
    await page.getByRole('button', { name: /Deschide firma BizNavMgmt/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.getByRole('button', { name: /Gestionează firme/i }).click();
    await expect(page).toHaveURL(/\/businesses/);
  });
});

test.describe('Navigation — Login page links', () => {
  test('register link on login page goes to /register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Înregistrează-te/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('login link on register page goes to /login', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /Autentifică-te/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
