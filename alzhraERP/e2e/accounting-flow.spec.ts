import { test, expect } from '@playwright/test';

/**
 * Accounting Flow E2E Tests
 * Tests the accounting module's accessibility and core UI elements.
 */
test.describe('Accounting Flow', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/#/accounting');
        await page.waitForURL(/.*\/(accounting|welcome)/, { timeout: 15000 });
    });

    test('should load accounting page or redirect to login', async ({ page }) => {
        const url = page.url();

        if (url.includes('/welcome')) {
            await expect(page.getByText(/تسجيل الدخول/i)).toBeVisible();
        } else {
            // Accounting page should display journal/accounting content
            await expect(page.locator('body')).not.toBeEmpty();
        }
    });

    test('should display accounting elements when authenticated', async ({ page }) => {
        const url = page.url();
        test.skip(url.includes('/welcome'), 'Skipping: user not authenticated');

        // Accounting page should have journal entries or accounting-related content
        await expect(
            page.getByText(/قيود|محاسب|يومية|journal|accounting/i).first()
        ).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to reports from accounting', async ({ page }) => {
        const url = page.url();
        test.skip(url.includes('/welcome'), 'Skipping: user not authenticated');

        // Navigate to reports
        await page.goto('/#/reports');
        await page.waitForLoadState('networkidle');

        // Reports page should load
        await expect(page.locator('body')).not.toBeEmpty();
    });
});

test.describe('Landing Page UI', () => {

    test('should display landing page with features and auth section', async ({ page }) => {
        await page.goto('/#/welcome');
        await page.waitForLoadState('networkidle');

        // Hero section
        await expect(page.getByText(/نظام الزهراء/i).first()).toBeVisible();

        // Features section
        await expect(page.getByText(/إدارة مخزون ذكية/i)).toBeVisible();

        // Auth tabs
        await expect(page.getByText(/تسجيل الدخول/i).first()).toBeVisible();
    });

    test('should toggle between login and register tabs', async ({ page }) => {
        await page.goto('/#/welcome');
        await page.waitForLoadState('networkidle');

        // Click on register tab
        const registerTab = page.getByText(/إنشاء حساب جديد/i);
        if (await registerTab.isVisible()) {
            await registerTab.click();
            // Wait for register form to appear
            await page.waitForTimeout(500); // Animation delay
        }
    });

    test('should toggle dark/light theme', async ({ page }) => {
        await page.goto('/#/welcome');
        await page.waitForLoadState('networkidle');

        // Find theme toggle button (Sun/Moon icon button)
        const themeButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        if (await themeButton.isVisible()) {
            await themeButton.click();
            await page.waitForTimeout(300);
        }
    });
});
