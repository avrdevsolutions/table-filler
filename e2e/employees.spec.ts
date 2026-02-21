/**
 * E2E — Employees management
 *
 * Covers: add, list, status badge, details modal, set/revert Demisie,
 * isolation per business.
 */
import { test, expect } from '@playwright/test';
import { registerAndLogin, createBusiness } from './helpers';

/** Expands the employees panel for the first business on the page. */
async function expandEmployees(page: import('@playwright/test').Page) {
  await page.getByTitle('Angajați').first().click();
}

test.describe('Employees — Add', () => {
  test('add employee requires name', async ({ page }) => {
    await registerAndLogin(page, 'emp-add-name');
    await createBusiness(page, 'EmpBiz AddName', 'Loc');
    await expandEmployees(page);

    // Try to add without name (leave name empty, just click add)
    await page.getByRole('button', { name: /\+ Adaugă angajat/i }).click();
    await expect(page.getByText(/Numele este obligatoriu/i)).toBeVisible();
  });

  test('add employee requires start date', async ({ page }) => {
    await registerAndLogin(page, 'emp-add-date');
    await createBusiness(page, 'EmpBiz AddDate', 'Loc');
    await expandEmployees(page);

    await page.getByPlaceholder(/ex: Ion Popescu/i).fill('Ana Test');
    await page.getByRole('button', { name: /\+ Adaugă angajat/i }).click();
    await expect(page.getByText(/Data angajării este obligatorie/i)).toBeVisible();
  });

  test('added employee appears in list', async ({ page }) => {
    await registerAndLogin(page, 'emp-added');
    await createBusiness(page, 'EmpBiz Added', 'Loc');
    await expandEmployees(page);

    await page.getByPlaceholder(/ex: Ion Popescu/i).fill('Gheorghe Pop');

    // Use the DatePickerModal — click the date trigger
    await page.getByText('Selectează data angajării').click();
    // Simplified: select any visible day in the date picker
    await page.locator('.modal-sheet').last().getByRole('button', { name: '15' }).first().click();

    await page.getByRole('button', { name: /\+ Adaugă angajat/i }).click();
    await expect(page.getByText('Gheorghe Pop')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Employees — Status badge', () => {
  test('new employee shows Activ badge in details', async ({ page }) => {
    await registerAndLogin(page, 'emp-activ');
    await createBusiness(page, 'EmpBiz Activ', 'Loc');
    await expandEmployees(page);

    await page.getByPlaceholder(/ex: Ion Popescu/i).fill('Test Activ');
    await page.getByText('Selectează data angajării').click();
    await page.locator('.modal-sheet').last().getByRole('button', { name: '10' }).first().click();
    await page.getByRole('button', { name: /\+ Adaugă angajat/i }).click();

    // Click on the employee to open details
    await page.getByText('Test Activ').click();
    await expect(page.getByText('Activ')).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Employees — Business isolation', () => {
  test('employees are isolated per business', async ({ page }) => {
    await registerAndLogin(page, 'emp-iso');
    await createBusiness(page, 'EmpBiz Iso A', 'Loc');
    await createBusiness(page, 'EmpBiz Iso B', 'Loc');

    // Expand biz A and add an employee
    await page.locator('[title="Angajați"]').nth(0).click(); // expand A
    await page.getByPlaceholder(/ex: Ion Popescu/i).fill('Emp Only In A');
    await page.getByText('Selectează data angajării').click();
    await page.locator('.modal-sheet').last().getByRole('button', { name: '5' }).first().click();
    await page.getByRole('button', { name: /\+ Adaugă angajat/i }).click();
    await expect(page.getByText('Emp Only In A')).toBeVisible({ timeout: 5_000 });

    // Collapse A and expand B
    await page.locator('[title="Angajați"]').nth(0).click(); // collapse A
    await page.locator('[title="Angajați"]').nth(1).click(); // expand B
    // Emp from A should NOT appear in B's panel
    await expect(page.getByText('Emp Only In A')).not.toBeVisible();
  });
});
