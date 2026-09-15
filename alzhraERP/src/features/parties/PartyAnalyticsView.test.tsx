import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PartyAnalyticsView from './components/PartyAnalyticsView';
import type { Party } from './types';

describe('PartyAnalyticsView', () => {
  const mockParties: Party[] = [
    {
      id: 'p-1',
      name: 'شركة الأمل للتجارة',
      phone: '967771234567',
      balance: 25000,
      category: 'جملة',
      status: 'active',
      company_id: 'comp-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      type: 'customer',
    } as Party,
    {
      id: 'p-2',
      name: 'مؤسسة النور',
      phone: '966501234567',
      balance: 12000,
      category: 'تجزئة',
      status: 'active',
      company_id: 'comp-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      type: 'customer',
    } as Party,
    {
      id: 'p-3',
      name: 'عميل مسوّى الحساب',
      balance: 0,
      status: 'active',
      company_id: 'comp-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      type: 'customer',
    } as Party,
  ];

  it('renders segmentation cards correctly', () => {
    const handleViewStatement = vi.fn();
    render(
      <PartyAnalyticsView
        partyType="customer"
        parties={mockParties}
        onViewStatement={handleViewStatement}
      />
    );

    expect(screen.getByText('عملاء كبار (VIP)')).toBeInTheDocument();
    expect(screen.getByText('مخاطر ائتمانية مرتفعة')).toBeInTheDocument();
    expect(screen.getByText('أرصدة مسواة بالكامل')).toBeInTheDocument();
    expect(screen.getByText('أعلى 5 عملاء مديونية للمطالبة')).toBeInTheDocument();
  });

  it('renders top debtors with party names', () => {
    const handleViewStatement = vi.fn();
    render(
      <PartyAnalyticsView
        partyType="customer"
        parties={mockParties}
        onViewStatement={handleViewStatement}
      />
    );

    expect(screen.getByText('شركة الأمل للتجارة')).toBeInTheDocument();
    expect(screen.getByText('مؤسسة النور')).toBeInTheDocument();
  });
});
