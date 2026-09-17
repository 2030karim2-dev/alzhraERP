import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BondModalFooter } from './BondModalFooter';

afterEach(cleanup);

describe('BondModalFooter', () => {
  it('routes save and cancel to their respective callbacks', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<BondModalFooter type="receipt" loading={false} onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'اعتماد السند وحفظه' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('blocks saving while submitting but keeps cancel available', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<BondModalFooter type="payment" loading onSave={onSave} onCancel={onCancel} />);

    const save = screen.getByRole('button', { busy: true });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['receipt', 'bg-emerald-600'],
    ['payment', 'bg-rose-600'],
    ['transfer', 'bg-blue-600'],
  ] as const)('preserves the save color for %s', (type, color) => {
    render(<BondModalFooter type={type} loading={false} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'اعتماد السند وحفظه' })).toHaveClass(color);
    expect(screen.getByText('Ctrl + Enter')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });
});
