import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PricingSection from './PricingSection';

describe('PricingSection', () => {
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
    render(<PricingSection onStart={onStart} />);

    // jsdom لا ينفّذ التنقل عبر mailto — نتجاهل أي خطأ ناتج عنه
    try {
      fireEvent.click(screen.getByRole('button', { name: 'اتصل بالمبيعات' }));
    } catch {
      /* navigation not implemented in jsdom */
    }
    expect(onStart).not.toHaveBeenCalled();
  });
});
