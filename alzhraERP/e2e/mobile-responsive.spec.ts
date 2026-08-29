import { test, expect } from '@playwright/test';

/**
 * Mobile Responsive E2E Tests
 * يتّبع نمط الملفات الحالية (hash routing، test.skip عند غياب المصادقة).
 * يتحقق من تحسينات الموبايل:
 *  1. لا تجاوز أفقي على شاشة هاتف في الواجهة العامة/الهبوط.
 *  2. الشريط السفلي ظاهر عند التوفر.
 *  3. شاشة القيود/الديون الداخلية لا تولّد تجاوزاً أفقياصفحات عند توفر جلسة.
 */
test.describe('Mobile Responsive Layout', () => {

    // Use a mobile viewport explicitly. لا ننسخ devices كاملاً (يتعارض مع نوع المتصفح في webkit)
    test.use({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    });

    test('home page has no horizontal overflow on mobile', async ({ page }) => {
        await page.goto('/#/');
        await page.waitForLoadState('domcontentloaded');

        const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
        });
        // تسامح 1px لمقاييس sub-pixel
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });

    test('welcome/landing has no horizontal overflow on mobile', async ({ page }) => {
        await page.goto('/#/welcome');
        await page.waitForLoadState('domcontentloaded');

        const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return { sw: doc.scrollWidth, cw: doc.clientWidth };
        });
        expect(overflow.sw).toBeLessThanOrEqual(overflow.cw + 1);
    });

    test('no sub-9.5px text is rendered on mobile landing', async ({ page }) => {
        await page.goto('/#/welcome');
        await page.waitForLoadState('domcontentloaded');

        const tiny = await page.evaluate(() => {
            const min = [];
            document.querySelectorAll('span,button,a,p,th,td,div').forEach((el) => {
                const fs = parseFloat(getComputedStyle(el).fontSize);
                if (fs > 0 && fs < 9.5) min.push(`${fs.toFixed(1)}:${(el.textContent || '').trim().slice(0, 30)}`);
            });
            return min.slice(0, 6);
        });
        expect(tiny).toEqual([]);
    });

    test('mobile bottom nav is visible when authenticated', async ({ page }) => {
        await page.goto('/#/');
        await page.waitForLoadState('domcontentloaded');

        const nav = page.getByRole('navigation', { name: /التنقل السفلي/i });
        if (await nav.count() > 0) {
            await expect(nav).toBeVisible();
            const box = await nav.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
                expect(box.y + box.height).toBeLessThanOrEqual(844);
                expect(box.height).toBeLessThanOrEqual(120); // 3.5rem + safe-area
            }
        } else {
            // غير مصادَق — التحقق من أن الصفحة لا تنكسر
            await expect(page.locator('body')).not.toBeEmpty();
        }
    });

    test('accounting/debts screens have no horizontal overflow when reachable', async ({ page }) => {
        await page.goto('/#/accounting');
        await page.waitForURL(/.*\/(accounting|welcome)/, { timeout: 15000 });
        const url = page.url();
        test.skip(url.includes('/welcome'), 'Skipping: user not authenticated');

        await page.waitForTimeout(800);
        const overflow = await page.evaluate(() => {
            const doc = document.documentElement;
            return { sw: doc.scrollWidth, cw: doc.clientWidth };
        });
        expect(overflow.sw).toBeLessThanOrEqual(overflow.cw + 1);
    });
});
