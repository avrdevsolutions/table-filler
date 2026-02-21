/**
 * E2E test helpers shared across spec files.
 *
 * Provides a standard way to register and log in a test user so each spec
 * can start from an authenticated state with isolated data.
 */
import { type Page, expect } from '@playwright/test';

let counter = 0;

/** Returns a unique email/password pair for a test user. */
export function uniqueCredentials(prefix = 'e2e') {
  counter++;
  const ts = Date.now();
  return {
    email: `${prefix}-${ts}-${counter}@e2etest.invalid`,
    password: 'TestPass123!',
    name: `${prefix} User`,
  };
}

/**
 * Registers a new user via the UI and returns credentials.
 * After success the browser is on /login.
 */
export async function registerUser(
  page: Page,
  creds = uniqueCredentials()
): Promise<typeof creds> {
  await page.goto('/register');
  await page.getByLabel('Nume').fill(creds.name);
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Parolă').fill(creds.password);
  await page.getByRole('button', { name: 'Creează cont' }).click();
  // After registration the app redirects to /login
  await expect(page).toHaveURL(/\/login/);
  return creds;
}

/**
 * Logs in with the provided credentials via the UI.
 * After success the browser is on /businesses.
 */
export async function loginUser(
  page: Page,
  creds: { email: string; password: string }
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Parolă').fill(creds.password);
  await page.getByRole('button', { name: 'Intră în cont' }).click();
  await expect(page).toHaveURL(/\/businesses/, { timeout: 15_000 });
}

/** Registers + logs in a fresh user and returns credentials. */
export async function registerAndLogin(
  page: Page,
  prefix = 'e2e'
): Promise<ReturnType<typeof uniqueCredentials>> {
  const creds = await registerUser(page, uniqueCredentials(prefix));
  await loginUser(page, creds);
  return creds;
}

/**
 * Creates a business via the UI modal.
 * Assumes the user is on /businesses.
 * Returns the created business name.
 */
export async function createBusiness(
  page: Page,
  name: string,
  location = 'Locatie Test'
): Promise<void> {
  await page.getByRole('button', { name: /Adaugă firmă/i }).first().click();
  await page.getByPlaceholder(/ex: SC Exemplu SRL/i).fill(name);
  await page.getByPlaceholder(/ex: Ansamblul Petrila/i).fill(location);
  await page.getByRole('button', { name: 'Salvează' }).click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 });
}
