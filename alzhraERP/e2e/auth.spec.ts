import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/#/login');
    });

    test('should display login form', async ({ page }) => {
        // Check for login form elements
        await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        // Fill in invalid credentials
        await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com');
        await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');

        // Click login button
        await page.getByRole('button', { name: /login|sign in/i }).click();

        // Check for error message
        await expect(page.getByText(/invalid|error|فشل/i)).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
        // Click on register link
        await page.getByRole('link', { name: /register|sign up|تسجيل/i }).click();

        // Check URL changed
        await expect(page).toHaveURL(/.*register.*/);
    });
});

test.describe('Dashboard (Authenticated)', () => {
    // This test requires authentication
    test.skip('should display dashboard after login', async ({ page }) => {
        // TODO: Implement authentication helper
        await page.goto('/');

        // Check for dashboard elements
        await expect(page.getByText(/dashboard|الرئيسية/i)).toBeVisible();
    });
});
