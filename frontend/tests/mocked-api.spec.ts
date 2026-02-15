import { test, expect } from '@playwright/test';

test.describe('Mocked API UI Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Log browser console for debugging
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()} `);
        });

        // 1. Mock Auth - simulate logged in session
        await page.route('**/api/auth', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'ok', authenticated: true }),
            });
        });

        // 2. Mock Feeds
        await page.route('**/api/feed/', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { _id: 1, title: 'Mock Feed 1', url: 'http://mock1.com', category: 'News' },
                    { _id: 2, title: 'Mock Feed 2', url: 'http://mock2.com', category: 'Tech' },
                ]),
            });
        });

        // 3. Mock Tags
        await page.route('**/api/tag', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { title: 'News' },
                    { title: 'Tech' },
                ]),
            });
        });

        // 4. Mock Stream/Items
        await page.route('**/api/stream*', async (route) => {
            const url = new URL(route.request().url());
            const maxId = url.searchParams.get('max_id');

            if (maxId) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]),
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        _id: 101,
                        feed_id: 1,
                        title: 'Mock Item Unread',
                        url: 'http://mock1.com/1',
                        description: 'This is an unread item',
                        publish_date: new Date().toISOString(),
                        read: false,
                        starred: false,
                        feed_title: 'Mock Feed 1'
                    },
                    {
                        _id: 102,
                        feed_id: 2,
                        title: 'Mock Item Starred',
                        url: 'http://mock2.com/1',
                        description: 'This is a starred and read item',
                        publish_date: new Date().toISOString(),
                        read: true,
                        starred: true,
                        feed_title: 'Mock Feed 2'
                    }
                ]),
            });
        });

        // 5. Mock Item Update (for marking read/starred)
        await page.route('**/api/item/**', async (route) => {
            if (route.request().method() === 'PUT') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ status: 'ok' }),
                });
            } else {
                await route.continue();
            }
        });

        // 6. Mock Logout
        await page.route('**/api/logout', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'ok' }),
            });
        });
    });

    test('should load dashboard with mocked feeds and items', async ({ page }) => {
        await page.goto('/v2/');

        // Wait for the logo to appear (means we are on the dashboard)
        await expect(page.locator('h1.logo')).toBeVisible({ timeout: 15000 });

        // Verify items in main view (ensure they load first)
        await expect(page.getByText('Mock Item Unread')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Mock Item Starred')).toBeVisible();

        // Verify feeds in sidebar
        // Click on the Feeds header to expand
        await page.getByText(/Feeds/i).click();

        // Wait for mocked feeds to appear in sidebar
        // We use a more specific selector to avoid matching the feed_title in the item list
        await expect(page.locator('.feed-list-items').getByText('Mock Feed 1')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.feed-list-items').getByText('Mock Feed 2')).toBeVisible();

        // Verify "unread" filter is active by default
        const unreadFilterLink = page.locator('.unread_filter a');
        await expect(unreadFilterLink).toHaveClass(/active/);
    });

    test('should filter by mocked tag', async ({ page }) => {
        await page.goto('/v2/');

        // Click on Tech tag
        await page.getByText('Tech', { exact: true }).click();

        // URL should update
        await expect(page).toHaveURL(/.*\/tag\/Tech/);

        // Verify feed items are still visible (mock stream returns both regardless of tag in this simple mock)
        await expect(page.getByText('Mock Item Unread')).toBeVisible();
    });

    test('should toggle item star status', async ({ page }) => {
        await page.goto('/v2/');

        const unreadItem = page.locator('.feed-item.unread').first();
        const starButton = unreadItem.getByTitle('Star');

        await starButton.click();

        // Expect star to change to "Unstar" (UI optimistic update)
        await expect(starButton).toHaveAttribute('title', 'Unstar');
    });

    test('should logout using mocked API', async ({ page }) => {
        await page.goto('/v2/');

        await page.getByText('logout').click();

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/login/);
    });
});
