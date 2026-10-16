import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/agenda',
  '/speakers',
  '/sponsors',
  '/organizadores',
  '/contacto',
  '/payment-info',
  '/anteriores',
  '/anteriores/2025',
  '/anteriores/2024',
];

for (const route of routes) {
  test(`${route} renders with metadata and no serious accessibility violations`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveTitle(/JConf Perú/);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /^https:\/\/jconfperu\.com\//);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://jconfperu.com/og-cover.png',
    );

    const accessibility = await new AxeBuilder({ page }).analyze();
    const blocking = accessibility.violations.filter(({ impact }) =>
      impact === 'critical' || impact === 'serious',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

for (const route of ['/', '/anteriores/2024']) {
  test(`${route} has no serious accessibility violations in dark mode`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jconf-theme', 'dark'));
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const accessibility = await new AxeBuilder({ page }).analyze();
    const blocking = accessibility.violations.filter(({ impact }) =>
      impact === 'critical' || impact === 'serious',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

test('mobile navigation opens and exposes the primary links', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only interaction');
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Abrir menú' });
  const menu = page.getByRole('navigation', { name: 'Móvil' });
  await expect(menu).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Agenda' })).toBeVisible();
});

test('home features JConf Perú 2026', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'JConf Perú 2026' })).toBeVisible();
});

test('anteriores menu archives the previous edition', async ({ page }, testInfo) => {
  await page.goto('/');
  const isMobile = testInfo.project.name === 'mobile-chromium';
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
  }

  const nav = page.getByRole('navigation', { name: isMobile ? 'Móvil' : 'Principal' });
  await nav.getByRole('button', { name: 'Anteriores' }).click();
  await expect(nav.getByRole('link', { name: '2025' })).toBeVisible();
  await expect(nav.getByRole('link', { name: '2024' })).toBeVisible();

  await nav.getByRole('link', { name: '2025' }).click();
  await expect(page).toHaveURL(/\/anteriores\/2025$/);
  await expect(page.getByRole('heading', { level: 1, name: 'JConf Perú 2025' })).toBeVisible();
});
