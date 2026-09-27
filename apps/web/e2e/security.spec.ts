import { expect, test } from '@playwright/test';

test('serves hardened frontend headers', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('administrator can sign in and reach the hardened account area', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('browser-admin@unigest.test');
  await page.getByLabel('Mot de passe').fill('BrowserAdminPassword123!');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.getByText('v0.5.1', { exact: true })).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('unigest_token'));
  expect(token).toBeTruthy();

  await page.getByRole('link', { name: 'Sécurité du compte' }).click();
  await expect(page).toHaveURL(/\/account-security$/);
  await expect(
    page.getByRole('heading', { name: 'Sécurité du compte' }),
  ).toBeVisible();
});

test('forgot-password flow does not disclose whether an account exists', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('unknown-person@example.test');
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();

  await expect(
    page.getByText(/Si un compte actif correspond à cette adresse/),
  ).toBeVisible();
});
