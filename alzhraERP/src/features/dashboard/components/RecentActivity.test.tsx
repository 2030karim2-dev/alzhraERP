import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentActivity from './RecentActivity';
import type { RecentActivityItem } from '../models';

describe('RecentActivity component', () => {
  it('renders empty state when no activities are provided', () => {
    render(<RecentActivity activities={[]} />);
    expect(screen.getByText('أحدث النشاطات')).toBeInTheDocument();
    expect(screen.getByText('لا توجد نشاطات مسجلة حديثاً')).toBeInTheDocument();
  });

  it('renders activities with their specific currencies correctly', () => {
    const mockActivities: RecentActivityItem[] = [
      {
        id: '1',
        title: 'فاتورة مبيعات (#INV-001)',
        type: 'sale',
        desc: '50 ر.س • الزبون العام',
        time: '2026-09-08T10:00:00Z',
        date: '2026-09-08',
        currency_code: 'SAR',
        color: 'blue',
      },
      {
        id: '2',
        title: 'مصروف: قات',
        type: 'expense',
        desc: '15,000 ر.ي',
        time: '2026-09-07T17:10:00Z',
        date: '2026-09-07',
        currency_code: 'YER',
        color: 'rose',
      },
      {
        id: '3',
        title: 'مصروف: باقه نت',
        type: 'expense',
        desc: '9,000 ر.ي',
        time: '2026-09-07T17:14:00Z',
        date: '2026-09-07',
        currency_code: 'YER',
        color: 'rose',
      },
    ];

    render(<RecentActivity activities={mockActivities} />);

    expect(screen.getByText('فاتورة مبيعات (#INV-001)')).toBeInTheDocument();
    expect(screen.getByText('50 ر.س • الزبون العام')).toBeInTheDocument();

    expect(screen.getByText('مصروف: قات')).toBeInTheDocument();
    expect(screen.getByText('15,000 ر.ي')).toBeInTheDocument();

    expect(screen.getByText('مصروف: باقه نت')).toBeInTheDocument();
    expect(screen.getByText('9,000 ر.ي')).toBeInTheDocument();

    expect(screen.getByText('3 عمليات')).toBeInTheDocument();
  });
});
