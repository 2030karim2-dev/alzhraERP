import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VinManualVehicleForm, type ManualVehicleDraft } from './VinManualVehicleForm';

const emptyDraft: ManualVehicleDraft = {
  make: '',
  model: '',
  yearStart: '',
  yearEnd: '',
  market: '',
  engine: '',
  transmission: '',
  drive: '',
  vinOptional: '',
};
const confirmLabel = 'تثبيت مواصفات المركبة والبدء باستخراج القطع';

function setup(patch: Partial<ManualVehicleDraft> = {}, isDecoding = false) {
  const onChange = vi.fn<(patch: Partial<ManualVehicleDraft>) => void>();
  const onApplyManualVehicle = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const props = { draft: { ...emptyDraft, ...patch }, onChange, onApplyManualVehicle, isDecoding };
  return { ...render(<VinManualVehicleForm {...props} />), props, onChange, onApplyManualVehicle };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('VinManualVehicleForm behavior', () => {
  it('emits field patches with existing numeric and VIN normalization', () => {
    const { onChange } = setup();
    for (const [placeholder, value, patch] of [
      ['أو اكتب اسم الماركة يدوياً...', 'Toyota', { make: 'Toyota' }],
      ['مثال: Corolla أو كورولا...', 'Corolla', { model: 'Corolla' }],
      ['2001', '٢٠١٦abc9', { yearStart: '2016' }],
      ['2007', '٢٠٢٢', { yearEnd: '2022' }],
      ['مثال: 1.8', '١.٨L', { engine: '1.8' }],
      ['JT3HN87R... (17 Chars)', ' jt3hn87r ', { vinOptional: 'JT3HN87R' }],
    ] as const) {
      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
      expect(onChange).toHaveBeenLastCalledWith(patch);
    }
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'خليجي' } });
    expect(onChange).toHaveBeenLastCalledWith({ market: 'خليجي' });
    fireEvent.click(screen.getByRole('button', { name: 'عادي (Manual)' }));
    expect(onChange).toHaveBeenLastCalledWith({ transmission: 'عادي' });
    fireEvent.click(screen.getByRole('button', { name: 'دبل (4x4)' }));
    expect(onChange).toHaveBeenLastCalledWith({ drive: 'دبل' });
  });

  it('preserves ordered preset callbacks and does not overwrite the optional VIN', () => {
    const { onChange } = setup({ vinOptional: 'KEEP' });
    fireEvent.click(screen.getByRole('button', { name: 'كورولا (2001-2007)' }));
    expect(onChange.mock.calls).toEqual([
      [{ make: 'Toyota' }],
      [{ model: 'Corolla' }],
      [{ yearStart: '2001' }],
      [{ yearEnd: '2007' }],
      [{ market: 'خليجي' }],
      [{ engine: '1.8' }],
      [{ transmission: 'تماتيك' }],
      [{ drive: 'سنجل' }],
    ]);
  });

  it('resets the model only when selecting a make preset', () => {
    const { onChange } = setup({ make: 'Toyota', model: 'Corolla' });
    fireEvent.click(screen.getByRole('button', { name: 'نيسان', exact: true }));
    expect(onChange.mock.calls).toEqual([[{ make: 'Nissan' }], [{ model: '' }]]);
    fireEvent.click(screen.getByRole('button', { name: 'كورولا', exact: true }));
    expect(onChange).toHaveBeenLastCalledWith({ model: 'Corolla' });
  });

  it('previews normalized years and defaults, and respects the pending state', () => {
    const { rerender, props, onApplyManualVehicle } = setup();
    expect(screen.queryByRole('button', { name: confirmLabel })).not.toBeInTheDocument();
    const draft = {
      ...props.draft,
      make: 'Toyota',
      model: 'Corolla',
      yearStart: '٢٠٢٢',
      yearEnd: '٢٠١٦',
    };
    rerender(<VinManualVehicleForm {...props} draft={draft} />);
    expect(screen.getByText('2016 - 2022')).toBeInTheDocument();
    expect(screen.getByText('المواصفات: خليجي')).toBeInTheDocument();
    expect(screen.getByText('الجير: تماتيك')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: confirmLabel }));
    expect(onApplyManualVehicle).toHaveBeenCalledTimes(1);
    rerender(<VinManualVehicleForm {...props} draft={draft} isDecoding />);
    const pending = screen.getByRole('button', { name: 'جاري التثبيت...' });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(onApplyManualVehicle).toHaveBeenCalledTimes(1);
  });
});
