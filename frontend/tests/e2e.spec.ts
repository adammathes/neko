import { test, expect } from '@playwright/test';

test.describe('Neko Reader E2E', () => {
    test('should allow login, viewing feeds, and logout', async ({ page }) => {
        // 1. Go to Login
        await page.goto('/v2/login');
        await expect(page).toHaveTitle(/Neko/);

        // 2. Login
        await page.fill('#password', '');
        await page.click('button[type="submit"]');

        // Check for error message if login failed (optional, for debugging)
        // await expect(page.locator('.error-message')).toBeVisible({ timeout: 2000 }).catch(() => {});

        // 3. Verify Dashboard
        // Keep checking for /v2/ or /v2
        await expect(page).toHaveURL(/.*\/v2\/?$/);
        await expect(page.locator('h1.logo')).toContainText('🐱');
        await expect(page.getByText('Logout')).toBeVisible();

        // 4. Verify Feed List
        await page.click('text=Settings');
        await expect(page).toHaveURL(/.*\/v2\/settings/);

        // Add a feed
        const feedUrl = 'http://rss.cnn.com/rss/cnn_topstories.rss';
        await page.fill('input[type="url"]', feedUrl);
        await page.click('text=Add Feed');

        // Wait for it to appear
        await expect(page.getByText(feedUrl)).toBeVisible();

        // 5. Navigate to Feed
        await page.goto('/v2/');
        // Default view is now the stream.
        // It should NOT show "Select a feed" anymore.
        // Wait for items or "No items found" or loading state
        await expect(page.locator('.feed-items').or(page.locator('.feed-items-loading')).or(page.getByText('No items found'))).toBeVisible({ timeout: 10000 });

        // 6. Verify Tag View
        // Go to a tag URL (simulated, since we can't easily add tags via UI in this test yet without setup)
        // But we can check if the route loads without crashing
        await page.goto('/v2/tag/Tech');
        // The TagView component might show "Category: Tech" or "Tag: Tech" or just items.
        // In the current FeedItems.tsx it doesn't show a header, but it should load.
        await expect(page.locator('.feed-items')).toBeVisible();

        // 7. Logout
        await page.click('text=Logout');
        await expect(page).toHaveURL(/.*\/v2\/login/);
    });
});
