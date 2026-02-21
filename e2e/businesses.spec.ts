/**
 * E2E — Businesses page
 *
 * Covers: create, edit, delete, selection, data isolation.
 */
import { test, expect } from '@playwright/test';
import { registerAndLogin, createBusiness } from './helpers';

test.describe('Businesses — CRUD', () => {
  test('new user sees empty state', async ({ page }) => {
    await registerAndLogin(page, 'biz-empty');
    await expect(page.getByText(/Nu ai încă nicio firmă/i)).toBeVisible();
  });

  test('create business (name + location required)', async ({ page }) => {
    await registerAndLogin(page, 'biz-create');
    await createBusiness(page, 'Firma Alfa', 'Locatie Alfa');
    await expect(page.getByText('Firma Alfa')).toBeVisible();
    await expect(page.getByText('Locatie Alfa')).toBeVisible();
  });

  test('create business — name required validation', async ({ page }) => {
    await registerAndLogin(page, 'biz-val-name');
    await page.getByRole('button', { name: /Adaugă firmă/i }).first().click();
    await page.getByPlaceholder(/ex: Ansamblul Petrila/i).fill('Loc');
    await page.getByRole('button', { name: 'Salvează' }).click();
    await expect(page.getByText(/Numele firmei este obligatoriu/i)).toBeVisible();
  });

  test('create business — location required validation', async ({ page }) => {
    await registerAndLogin(page, 'biz-val-loc');
    await page.getByRole('button', { name: /Adaugă firmă/i }).first().click();
    await page.getByPlaceholder(/ex: SC Exemplu SRL/i).fill('My Business');
    await page.getByRole('button', { name: 'Salvează' }).click();
    await expect(page.getByText(/Locația este obligatorie/i)).toBeVisible();
  });

  test('edit business', async ({ page }) => {
    await registerAndLogin(page, 'biz-edit');
    await createBusiness(page, 'Firma Edit', 'Loc Initial');

    // Open overflow menu
    await page.getByRole('button', { name: /Opțiuni/i }).click();
    await page.getByRole('button', { name: /Editează/i }).click();

    // Edit form is visible — update name
    const nameInput = page.getByPlaceholder(/ex: SC Exemplu SRL/i);
    await nameInput.clear();
    await nameInput.fill('Firma Editata');
    await page.getByRole('button', { name: 'Salvează' }).click();
    await expect(page.getByText('Firma Editata')).toBeVisible();
  });

  test('delete business via confirm modal', async ({ page }) => {
    await registerAndLogin(page, 'biz-delete');
    await createBusiness(page, 'Firma DeShters', 'Loc');

    await page.getByRole('button', { name: /Opțiuni/i }).click();
    await page.getByRole('button', { name: /Șterge/i }).click();

    // Confirm deletion in modal
    await page.getByRole('button', { name: /Șterge definitiv/i }).click();

    await expect(page.getByText('Firma DeShters')).not.toBeVisible({ timeout: 5_000 });
  });

  test('selecting business saves to localStorage and opens dashboard', async ({ page }) => {
    await registerAndLogin(page, 'biz-select');
    await createBusiness(page, 'Firma Select', 'Loc');

    // Click the business card (not the action buttons)
    await page.getByRole('button', { name: /Deschide firma Firma Select/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Reload to verify localStorage persistence
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Firma Select/)).toBeVisible();
  });
});

test.describe('Businesses — Data isolation', () => {
  test('user A cannot see user B businesses', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await registerAndLogin(pageA, 'biz-iso-a');
    await createBusiness(pageA, 'Firma Izolata A', 'Loc A');

    await registerAndLogin(pageB, 'biz-iso-b');
    // User B should NOT see User A's business
    await expect(pageB.getByText('Firma Izolata A')).not.toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
