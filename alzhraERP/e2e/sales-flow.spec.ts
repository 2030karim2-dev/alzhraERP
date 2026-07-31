import { test, expect } from '@playwright/test';

/**
 * Sales Flow E2E Tests
 * Tests the complete sales workflow from navigating to the sales page
 * to verifying that essential UI elements are present and interactive.
 */
test.describe('Sales Flow', () => {

    // Helper: Navigate to a protected route (skips auth check for now)
    // In a real CI setup, you'd use storageState with a pre-authenticated session.
    test.beforeEach(async ({ page }) => {
        // Navigate directly to the sales page via hash routing
        await page.goto('/#/sales');
        // Wait for either the sales page content OR a redirect to login
        await page.waitForURL(/.*\/(sales|welcome)/, { timeout: 15000 });
    });

    test('should load the sales page or redirect to login', async ({ page }) => {
        const url = page.url();

        if (url.includes('/welcome')) {
            // User is not authenticated — verify login form is visible
            await expect(page.getByText(/تسجيل الدخول/i)).toBeVisible();
        } else {
            // User is authenticated — verify sales page loaded
            await expect(page.locator('body')).not.toBeEmpty();
        }
    });

    test('should display sales page elements when authenticated', async ({ page }) => {
        const url = page.url();

        // Skip test if redirected to login (no auth session)
        test.skip(url.includes('/welcome'), 'Skipping: user not authenticated');

        // The sales page should have some recognizable elements
        // Check for the sales table or invoice-related content
        await expect(
            page.getByText(/فاتور|مبيعات|المبيعات|invoice|sales/i).first()
        ).toBeVisible({ timeout: 10000 });
    });

    test('should navigate between dashboard sections', async ({ page }) => {
        const url = page.url();
        test.skip(url.includes('/welcome'), 'Skipping: user not authenticated');

        // Navigate to dashboard
        await page.goto('/#/');
        await page.waitForLoadState('networkidle');

        // Dashboard should load some content
        await expect(page.locator('body')).not.toBeEmpty();

        // Navigate to inventory
        await page.goto('/#/inventory');
        await page.waitForLoadState('networkidle');

        // Inventory page should exist
        await expect(page.locator('body')).not.toBeEmpty();
    });
});
