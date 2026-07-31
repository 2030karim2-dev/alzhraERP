
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from './StatCard';
import { DollarSign } from 'lucide-react';

describe('StatCard Component', () => {
  const defaultProps = {
    title: 'Total Sales',
    value: '50,000 SAR',
    icon: DollarSign,
    colorClass: 'text-blue-500',
    iconBgClass: 'bg-blue-500'
  };

  it('renders title and value correctly', () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('50,000 SAR')).toBeInTheDocument();
  });

  it('renders subtext when provided', () => {
    render(<StatCard {...defaultProps} subtext="Compared to last month" />);
    expect(screen.getByText('Compared to last month')).toBeInTheDocument();
  });

  it('renders trend indicator correctly', () => {
    render(<StatCard {...defaultProps} trend={{ value: 12, isPositive: true }} />);
    expect(screen.getByText('↑ 12%')).toBeInTheDocument();
    expect(screen.getByText('↑ 12%')).toHaveClass('text-emerald-600');
  });

  it('renders negative trend correctly', () => {
    render(<StatCard {...defaultProps} trend={{ value: 5, isPositive: false }} />);
    expect(screen.getByText('↓ 5%')).toBeInTheDocument();
    expect(screen.getByText('↓ 5%')).toHaveClass('text-rose-600');
  });
});
