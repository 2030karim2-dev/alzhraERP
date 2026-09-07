import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ExcelCartTable } from './ExcelCartTable';
import type { SalesCartItem } from '../../../sales/store';

describe('ExcelCartTable', () => {
  const mockItems: SalesCartItem[] = [
    {
      id: 'item-1',
      productId: 'prod-1',
      sku: 'SKU-001',
      name: 'فلتر زيت تويوتا أصل',
      partNumber: '04152-YZZA6',
      quantity: 2,
      basePrice: 25,
      price: 25,
      discount: 0,
      costPrice: 15,
    },
    {
      id: 'item-2',
      productId: 'prod-2',
      sku: 'SKU-002',
      name: 'بواجي ليزر إيريديوم',
      partNumber: 'SK20HR11',
      quantity: 4,
      basePrice: 45,
      price: 45,
      discount: 0,
      costPrice: 30,
    },
  ];

  const defaultProps = {
    items: mockItems,
    onUpdateQuantity: vi.fn(),
    onRemoveClick: vi.fn(),
    editingPriceId: null,
    setEditingPriceId: vi.fn(),
  };

  it('renders table headers and row index numbers correctly', () => {
    render(<ExcelCartTable {...defaultProps} />);

    expect(screen.getByText('اسم الصنف')).toBeDefined();
    expect(screen.getByText('رقم القطعة')).toBeDefined();
    expect(screen.getByText('الكمية')).toBeDefined();
    expect(screen.getByText('السعر')).toBeDefined();
    expect(screen.getByText('الإجمالي')).toBeDefined();

    // Check row numbers
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);

    // Check item names
    expect(screen.getByText('فلتر زيت تويوتا أصل')).toBeDefined();
    expect(screen.getByText('بواجي ليزر إيريديوم')).toBeDefined();
  });

  it('handles keyboard navigation with ArrowDown and ArrowUp', () => {
    const { container } = render(<ExcelCartTable {...defaultProps} />);

    const tableContainer = screen.getByTestId('excel-cart-container');
    tableContainer.focus();

    // Initial focus on row 0
    const rowHeaders = container.querySelectorAll('tbody tr td:first-child');
    expect(rowHeaders[0]?.className).toContain('bg-blue-600');

    // Move to row 1
    fireEvent.keyDown(tableContainer, { key: 'ArrowDown' });
    expect(rowHeaders[1]?.className).toContain('bg-blue-600');

    // Move back up to row 0
    fireEvent.keyDown(tableContainer, { key: 'ArrowUp' });
    expect(rowHeaders[0]?.className).toContain('bg-blue-600');
  });

  it('handles + and - keys to increment and decrement quantity', () => {
    const onUpdateQuantity = vi.fn();
    render(<ExcelCartTable {...defaultProps} onUpdateQuantity={onUpdateQuantity} />);

    const container = screen.getByTestId('excel-cart-container');
    container.focus();

    // Increment with +
    fireEvent.keyDown(container, { key: '+' });
    expect(onUpdateQuantity).toHaveBeenCalledWith('prod-1', 3);

    // Decrement with -
    fireEvent.keyDown(container, { key: '-' });
    expect(onUpdateQuantity).toHaveBeenCalledWith('prod-1', 1);
  });

  it('handles Delete key to remove the active item', () => {
    const onRemoveClick = vi.fn();
    render(<ExcelCartTable {...defaultProps} onRemoveClick={onRemoveClick} />);

    const container = screen.getByTestId('excel-cart-container');
    container.focus();

    fireEvent.keyDown(container, { key: 'Delete' });
    expect(onRemoveClick).toHaveBeenCalledWith('prod-1');
  });
});
