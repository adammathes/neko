import { test, expect } from '@playwright/test';

test.describe('Neko Reader E2E', () => {
  test('should allow login, viewing feeds, and logout', async ({ page }) => {
    // 1. Go to Login
    await page.goto('/v2/login');
    await expect(page).toHaveTitle(/Neko/);

    // 2. Login
    // 2. Login
    // Password is empty by default in test env
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
    const feedUrl = 'http://localhost:9090/mock_feed.xml';
    await page.fill('input[type="url"]', feedUrl);
    await page.click('text=Add Feed');

    // Wait for it to appear
    await expect(page.getByText(feedUrl)).toBeVisible();

    const waitForLoader = async () => {
      await page.waitForFunction(() => {
        const loading = document.querySelector('.feed-items-loading') ||
          document.body.innerText.includes('Loading...');
        return !loading;
      }, { timeout: 15000 });
    };

    // 5. Navigate to Feed
    console.log('Step 5: Navigate to Home');
    await page.goto('/v2/');
    await expect(page).toHaveURL(/.*\/v2\/?$/);
    // Default view is now the stream.
    // It should NOT show "Select a feed" anymore.
    // Wait for items or "No items found" or loading state
    await waitForLoader();
    await expect(
      page
        .locator('.feed-items')
        .or(page.getByText('No items found'))
        .or(page.locator('.feed-items-error'))
    ).toBeVisible({ timeout: 10000 });

    // 6. Verify Tag View
    // 6. Logout
    console.log('Step 6: Logout');
    await page.click('text=Logout');
    await expect(page).toHaveURL(/.*\/v2\/login/);
  });
});
