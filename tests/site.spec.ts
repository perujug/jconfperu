import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/agenda',
  '/speakers',
  '/sponsors',
  '/organizadores',
  '/contacto',
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
