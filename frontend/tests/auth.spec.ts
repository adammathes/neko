import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flows.
 * 
 * These tests verify login behavior both with and without a password configured.
 * The current setup assumes no password (default for dev), so the password-required
 * tests are marked as skip. To run those, start the backend with --password=testpass.
 */

test.describe('Authentication - No Password Required', () => {
    test('should allow direct access to dashboard without login', async ({ page }) => {
        // When no password is configured, users should be able to access
        // the dashboard directly without seeing the login page
        await page.goto('/v2/');

        // Should not redirect to login
        await expect(page).toHaveURL(/.*\/v2\/?$/);

        // Should see the dashboard elements
        await expect(page.locator('h1.logo')).toContainText('🐱');
        await expect(page.getByText('Logout')).toBeVisible();
    });

    test('should allow login with empty password', async ({ page }) => {
        // Visit login page
        await page.goto('/v2/login');

        // Fill username and submit with empty password
        await page.fill('input[id="username"]', 'neko');
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL(/.*\/v2\/?$/, { timeout: 5000 });
        await expect(page.locator('h1.logo')).toContainText('🐱');
    });

    test('should report authenticated status via API when no password', async ({ request }) => {
        // Check auth status
        const response = await request.get('/api/auth');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data.authenticated).toBe(true);
    });
});

test.describe('Authentication - Password Required', () => {
    // These tests require the backend to be started with a password
    // Example: neko --password=testpass
    // Skip by default since dev environment has no password

    test.skip('should redirect to login when accessing protected routes', async ({ page, context }) => {
        // Clear any existing cookies
        await context.clearCookies();

        // Try to access dashboard
        await page.goto('/v2/');

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
    });

    test.skip('should reject incorrect password', async ({ page }) => {
        await page.goto('/v2/login');

        // Enter wrong password
        await page.fill('input[id="username"]', 'neko');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Should show error message
        await expect(page.getByText(/bad credentials|login failed/i)).toBeVisible({ timeout: 3000 });

        // Should still be on login page
        await expect(page).toHaveURL(/.*\/login/);
    });

    test.skip('should accept correct password and redirect to dashboard', async ({ page }) => {
        await page.goto('/v2/login');

        // Enter correct password (must match what the server was started with)
        await page.fill('input[id="username"]', 'neko');
        await page.fill('input[type="password"]', 'testpass');
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL(/.*\/v2\/?$/, { timeout: 5000 });
        await expect(page.locator('h1.logo')).toContainText('🐱');
        await expect(page.getByText('Logout')).toBeVisible();
    });

    test.skip('should persist authentication across page reloads', async ({ page }) => {
        // Login first
        await page.goto('/v2/login');
        await page.fill('input[id="username"]', 'neko');
        await page.fill('input[type="password"]', 'testpass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/v2\/?$/);

        // Reload the page
        await page.reload();

        // Should still be authenticated (not redirected to login)
        await expect(page).toHaveURL(/.*\/v2\/?$/);
        await expect(page.locator('h1.logo')).toContainText('🐱');
    });

    test.skip('should logout and redirect to login page', async ({ page }) => {
        // Login first
        await page.goto('/v2/login');
        await page.fill('input[id="username"]', 'neko');
        await page.fill('input[type="password"]', 'testpass');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*\/v2\/?$/);

        // Click logout
        await page.click('text=Logout');

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/login/);

        // Try to access dashboard again - should redirect to login
        await page.goto('/v2/');
        await expect(page).toHaveURL(/.*\/login/);
    });

    test.skip('should report unauthenticated status via API', async ({ request, context }) => {
        // Clear cookies
        await context.clearCookies();

        // Check auth status
        const response = await request.get('/api/auth');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data.authenticated).toBe(false);
    });
});

test.describe('Authentication - Complete Flow', () => {
    test('should handle complete user flow without password', async ({ page }) => {
        // 1. Access dashboard directly
        await page.goto('/v2/');
        await expect(page.locator('h1.logo')).toContainText('🐱');

        // 2. Navigate to settings
        await page.click('text=Settings');
        await expect(page).toHaveURL(/.*\/settings/);

        // 3. Add a feed (this tests that API calls work when no password)
        const feedUrl = 'http://example.com/rss.xml';
        await page.fill('input[type="url"]', feedUrl);
        await page.click('text=Add Feed');

        // Wait for success (feed should appear)
        await expect(page.getByText(feedUrl)).toBeVisible({ timeout: 3000 });

        // 4. Navigate back to main view
        await page.goto('/v2/');
        await expect(page.locator('h1.logo')).toContainText('🐱');

        // 5. Logout (should work even with no password)
        await page.click('text=Logout');
        await expect(page).toHaveURL(/.*\/login/);
    });
});
