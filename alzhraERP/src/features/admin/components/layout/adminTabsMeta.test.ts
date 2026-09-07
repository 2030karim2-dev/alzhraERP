import { describe, it, expect } from 'vitest';
import { resolveAdminTab, VALID_ADMIN_TABS, ADMIN_TAB_ITEM } from './adminTabsMeta';
import type { AdminTab } from '../../types';

describe('resolveAdminTab (deep-linking عبر URL)', () => {
  it('يُحلّ كل تبويب صالح إلى نفسه', () => {
    const tabs: AdminTab[] = [
      'overview',
      'companies',
      'subscriptions',
      'users',
      'telemetry',
      'security',
      'settings',
    ];
    for (const tab of tabs) {
      expect(resolveAdminTab(tab)).toBe(tab);
    }
  });

  it('يعود إلى overview للمسار الجذر (undefined / فارغ)', () => {
    expect(resolveAdminTab(undefined)).toBe('overview');
    expect(resolveAdminTab('')).toBe('overview');
  });

  it('يعود بأمان إلى overview لأي قيمة غير معروفة (رابط خاطئ)', () => {
    expect(resolveAdminTab('hack')).toBe('overview');
    expect(resolveAdminTab('security/honeypot')).toBe('overview');
    expect(resolveAdminTab('Companies')).toBe('overview'); // حساسية الأحرف
  });

  it('يحافظ على تماسك البيانات الوصفية: كل تبويب صالح له تعريف ومسار فرعي', () => {
    for (const id of Array.from(VALID_ADMIN_TABS)) {
      const def = ADMIN_TAB_ITEM[id as AdminTab];
      expect(def.id).toBe(id);
      expect(typeof def.label).toBe('string');
      expect(def.label.length).toBeGreaterThan(0);
      expect(typeof def.pathSuffix).toBe('string');
      expect(def.icon).toBeTruthy();
    }
  });
});
