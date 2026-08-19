import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as FramerMotion from 'framer-motion';

// تحكم قابل للتغيير في حالة "في نطاق العرض" لاختبار الوجهين
const { mockInView } = vi.hoisted(() => ({ mockInView: { value: false } }));

vi.mock('framer-motion', async importOriginal => {
  const actual = await importOriginal<typeof FramerMotion>();
  return { ...actual, useInView: () => mockInView.value };
});

import LazySection from './LazySection';

describe('LazySection', () => {
  beforeEach(() => {
    mockInView.value = false;
  });

  it('يعرض عنصر حجز ولا يركّب المحتوى قبل دخول القسم لنافذة العرض', () => {
    render(
      <LazySection>
        <div>محتويات القسم الكسول</div>
      </LazySection>
    );
    expect(screen.queryByText('محتويات القسم الكسول')).not.toBeInTheDocument();
  });

  it('يركّب المحتوى فور اقتراب القسم من نافذة العرض', () => {
    mockInView.value = true;
    render(
      <LazySection>
        <div>محتويات القسم الكسول</div>
      </LazySection>
    );
    expect(screen.getByText('محتويات القسم الكسول')).toBeInTheDocument();
  });
});
