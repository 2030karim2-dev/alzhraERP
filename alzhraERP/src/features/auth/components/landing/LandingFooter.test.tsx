import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingFooter from './LandingFooter';

const noop = vi.fn();

const renderFooter = () =>
  render(
    <LandingFooter
      scrollToFeatures={noop}
      scrollToHowItWorks={noop}
      scrollToAuth={noop}
      scrollToPricing={noop}
      scrollToFAQ={noop}
    />
  );

describe('LandingFooter', () => {
  it('يعرض رسالة نجاح عند الاشتراك بريداً صالحاً', () => {
    renderFooter();
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني للنشرة البريدية'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'الاشتراك في النشرة البريدية' }));
    expect(screen.getByText(/تم الاشتراك بنجاح/)).toBeInTheDocument();
  });

  it('لا يعرض رسالة نجاح عند إدخال بريد غير صالح', () => {
    renderFooter();
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني للنشرة البريدية'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'الاشتراك في النشرة البريدية' }));
    expect(screen.queryByText(/تم الاشتراك بنجاح/)).not.toBeInTheDocument();
  });

  it('يعرض روابط تواصل فعّالة بدل الأزرار الميتة', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'إرسال بريد إلكتروني' })).toHaveAttribute(
      'href',
      'mailto:2030.krim2@gmail.com'
    );
    expect(screen.getByRole('link', { name: 'زيارة الموقع التعريفي' })).toHaveAttribute(
      'href',
      'https://alzahra-erp.app'
    );
  });
});
