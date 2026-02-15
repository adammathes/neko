import { test, expect } from '@playwright/test';

test.describe('Font Theme Settings', () => {
    test('should change font family when theme starts', async ({ page }) => {
        // 1. Login
        await page.goto('/v2/login');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/v2\/?$/);

        // 2. Go to Settings
        await page.click('text=Settings');
        await expect(page).toHaveURL(/.*\/v2\/settings/);

        // 3. Verify Default Font (Palatino)
        // We check the computed style of the dashboard container or a body element
        const dashboard = page.locator('.dashboard');
        await expect(dashboard).toHaveCSS('font-family', /Palatino/);

        // 4. Change to Sans-Serif
        await page.selectOption('select.font-select', 'sans');

        // 5. Verify Sans Font (Inter)
        await expect(dashboard).toHaveCSS('font-family', /Inter/);

        // 6. Change to Monospace
        await page.selectOption('select.font-select', 'mono');

        // 7. Verify Mono Font (Menlo or Monaco or Courier)
        await expect(dashboard).toHaveCSS('font-family', /Menlo|Monaco|Courier/);
    });
});
