/**
 * E2E — Authentication flows
 *
 * Covers: register, login, logout, invalid credentials, field validation.
 */
import { test, expect } from '@playwright/test';
import { registerAndLogin, registerUser, uniqueCredentials } from './helpers';

test.describe('Auth — Register', () => {
  test('register → redirected to /login', async ({ page }) => {
    const creds = uniqueCredentials('reg');
    await registerUser(page, creds);
    await expect(page).toHaveURL(/\/login/);
  });

  test('field validation — empty email', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Parolă').fill('password123');
    await page.getByRole('button', { name: 'Creează cont' }).click();
    await expect(page.getByText(/Emailul este obligatoriu/i)).toBeVisible();
  });

  test('field validation — invalid email format', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Parolă').fill('password123');
    await page.getByRole('button', { name: 'Creează cont' }).click();
    await expect(page.getByText(/Format email invalid/i)).toBeVisible();
  });

  test('field validation — password too short', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill('short@test.com');
    await page.getByLabel('Parolă').fill('abc');
    await page.getByRole('button', { name: 'Creează cont' }).click();
    await expect(page.getByText(/minim 6 caractere/i)).toBeVisible();
  });

  test('duplicate email shows error', async ({ page }) => {
    const creds = uniqueCredentials('dup');
    await registerUser(page, creds);
    // Try to register again with the same email
    await page.goto('/register');
    await page.getByLabel('Email').fill(creds.email);
    await page.getByLabel('Parolă').fill(creds.password);
    await page.getByRole('button', { name: 'Creează cont' }).click();
    await expect(page.getByText(/deja înregistrat/i)).toBeVisible();
  });
});

test.describe('Auth — Login', () => {
  test('login → /businesses', async ({ page }) => {
    await registerAndLogin(page, 'login');
    await expect(page).toHaveURL(/\/businesses/);
  });

  test('invalid credentials → error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nonexistent@test.com');
    await page.getByLabel('Parolă').fill('wrongpassword');
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    await expect(page.getByText(/Email sau parolă incorectă/i)).toBeVisible();
  });

  test('field validation — empty email', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Parolă').fill('something');
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    await expect(page.getByText(/Emailul este obligatoriu/i)).toBeVisible();
  });

  test('field validation — invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('bad-email');
    await page.getByLabel('Parolă').fill('something');
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    await expect(page.getByText(/Format email invalid/i)).toBeVisible();
  });
});

test.describe('Auth — Logout', () => {
  test('logout → /login', async ({ page }) => {
    await registerAndLogin(page, 'logout');
    await page.getByRole('button', { name: /Ieșire din cont/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe('Auth — Guarded routes', () => {
  test('unauthenticated /businesses → /login', async ({ page }) => {
    await page.goto('/businesses');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated /dashboard → /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated /businesses redirects with returnTo param', async ({ page }) => {
    await page.goto('/businesses');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('returnTo=%2Fbusinesses');
  });

  test('authenticated user visiting /login → /businesses', async ({ page }) => {
    await registerAndLogin(page, 'guard-login');
    await page.goto('/login');
    await expect(page).toHaveURL(/\/businesses/, { timeout: 10_000 });
  });

  test('authenticated user visiting /register → /businesses', async ({ page }) => {
    await registerAndLogin(page, 'guard-register');
    await page.goto('/register');
    await expect(page).toHaveURL(/\/businesses/, { timeout: 10_000 });
  });

  test('returnTo: login redirects to originally requested page', async ({ page }) => {
    const creds = await registerUser(page, uniqueCredentials('returnTo'));
    // Navigate to login with a returnTo parameter
    await page.goto('/login?returnTo=/businesses');
    await page.getByLabel('Email').fill(creds.email);
    await page.getByLabel('Parolă').fill(creds.password);
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    await expect(page).toHaveURL(/\/businesses/, { timeout: 15_000 });
  });
});
