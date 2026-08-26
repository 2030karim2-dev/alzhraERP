import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PricingSection from './PricingSection';

describe('PricingSection', () => {
  // jsdom يرمي "Not implemented: navigation" عبر قناة stderr الخاصة به عند
  // أي تخصيص لـ location.href — نستبدل location بنموذج قبل أي نقر بريدي
  // لمنع الضجيج من مصدره بدلاً من محاولة التقاطه بعد وقوعه.
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  const stubNavigation = (): void => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '', assign: vi.fn() },
    });
  };

  it('يستدعي onStart عند النقر على "ابدأ مجاناً" (الباقة المجانية)', () => {
    const onStart = vi.fn();
    render(<PricingSection onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ مجاناً' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('يستدعي onStart عند النقر على "ابدأ النسخة التجريبية" (الباقة الاحترافية)', () => {
    const onStart = vi.fn();
    render(<PricingSection onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ النسخة التجريبية' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('لا يستدعي onStart عند النقر على باقة المؤسسات (ترسل بريداً)', () => {
    const onStart = vi.fn();
    stubNavigation();
    render(<PricingSection onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: 'اتصل بالمبيعات' }));
    expect(onStart).not.toHaveBeenCalled();
    // تم محاولة الانتقال إلى البريد بدلاً من بدء الاشتراك
    expect(window.location.href).toContain('mailto:');
  });
});

