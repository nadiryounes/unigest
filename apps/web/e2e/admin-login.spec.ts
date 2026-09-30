import { expect, test } from '@playwright/test';

test('administrator can sign in and reach the operational dashboard', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('E2E admin credentials are required');

  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.locator('.sidebar .version')).toHaveText('v0.5.2');
  await expect(page.getByText(/ADMIN/)).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('unigest_token'));
  expect(token).toBeTruthy();

  await page.goto('/security');
  await expect(page.getByRole('heading', { name: 'Sécurité du compte' })).toBeVisible();
  await expect(page.getByText(/Authentification à deux facteurs/)).toBeVisible();
});
