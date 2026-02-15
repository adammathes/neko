import { test, expect } from '@playwright/test';

test.describe('Crawl Integration', () => {
    test('should add a feed and see items after crawl', async ({ page }) => {
        const mockFeedUrl = 'http://localhost:9090/mock_feed.xml';

        // 1. Login and go to Settings
        await page.goto('/v2/settings');

        // 2. Add the mock feed
        await page.fill('input[type="url"]', mockFeedUrl);
        await page.click('text=Add Feed');

        // Wait for feed to be added
        await expect(page.getByText(mockFeedUrl)).toBeVisible({ timeout: 5000 });

        // 3. Trigger Crawl
        const crawlButton = page.getByRole('button', { name: /crawl/i });
        await expect(crawlButton).toBeVisible();

        // Handle the alert
        page.on('dialog', dialog => dialog.accept());
        await crawlButton.click();

        // 4. Go to Home and check for items
        await page.goto('/v2/');

        // The mock feed has "Mock Item 1" and "Mock Item 2"
        await expect(page.getByText('Mock Item 1')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Mock Item 2')).toBeVisible({ timeout: 10000 });
    });
});
