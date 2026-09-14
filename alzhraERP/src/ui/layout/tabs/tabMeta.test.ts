import { describe, it, expect } from 'vitest';
import { getTabMeta, QUICK_LAUNCH_ITEMS } from './tabMeta';
import { ROUTES } from '../../../core/routes/paths';

describe('tabMeta', () => {
  it('returns default root meta for home', () => {
    const meta = getTabMeta('/');
    expect(meta.title).toBe('الرئيسية');
    expect(meta.iconKey).toBe('LayoutDashboard');
  });

  it('returns correct titles for sales and pos', () => {
    expect(getTabMeta(ROUTES.DASHBOARD.SALES).title).toBe('المبيعات والفواتير');
    expect(getTabMeta(ROUTES.DASHBOARD.POS).title).toBe('نقطة البيع POS');
  });

  it('returns correct titles for bonds and accounting', () => {
    expect(getTabMeta(ROUTES.DASHBOARD.BONDS).title).toBe('السندات المالية');
    expect(getTabMeta(ROUTES.DASHBOARD.ACCOUNTING).title).toBe('المحاسبة والقيود');
  });

  it('strips query parameters when determining tab meta', () => {
    const meta = getTabMeta('/inventory?filter=low_stock&category=oil');
    expect(meta.title).toBe('المخزون والأصناف');
    expect(meta.iconKey).toBe('Package');
  });

  it('provides quick launch items with valid titles and paths', () => {
    expect(QUICK_LAUNCH_ITEMS.length).toBeGreaterThan(5);
    QUICK_LAUNCH_ITEMS.forEach(item => {
      expect(item.title).toBeTruthy();
      expect(item.path).toBeTruthy();
      expect(item.iconKey).toBeTruthy();
    });
  });
});
