import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const catalog =
  'Toyota Parts Catalogs LAND CRUISER 2016\nVIN: URJ2000123456\nEngine: 3URFE (5.7L V8)\nMarket: GCC';
const applyLabel = 'تطبيق كافة المواصفات في النموذج';

function setup(patch: Partial<ManualVehicleDraft> = {}) {
  const onChange = vi.fn<(patch: Partial<ManualVehicleDraft>) => void>();
  render(
    <VinManualVehicleForm
      draft={{ ...emptyDraft, ...patch }}
      onChange={onChange}
      onApplyManualVehicle={vi.fn<() => Promise<void>>().mockResolvedValue(undefined)}
      isDecoding={false}
    />
  );
  return { onChange };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('VinManualVehicleForm catalog and reset', () => {
  it('requires explicit apply for typed catalog text and clears only the catalog text', () => {
    const { onChange } = setup({ engine: '1.8', drive: 'دبل' });
    const textarea = screen.getByPlaceholderText(/الصق هنا أي نص/);
    fireEvent.change(textarea, { target: { value: catalog } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: applyLabel }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        make: 'تويوتا',
        model: 'LAND CRUISER',
        engine: '3URFE (5.7L V8)',
        vinOptional: 'URJ2000123456',
      })
    );
    expect(onChange.mock.calls[0]?.[0]).toHaveProperty('drive', 'دبل');
    fireEvent.click(screen.getByTitle('مسح النص'));
    expect(textarea).toHaveValue('');
    expect(screen.queryByRole('button', { name: applyLabel })).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('pastes and applies clipboard content in one action', async () => {
    const readText = vi.fn().mockResolvedValue(catalog);
    vi.stubGlobal('navigator', { clipboard: { readText } });
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'لصق واستخراج تلقائي' }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
    });
    expect(readText).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText(/الصق هنا أي نص/)).toHaveValue(catalog);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ make: 'تويوتا', model: 'LAND CRUISER' })
    );
  });

  it.each(['empty', 'denied'] as const)(
    'keeps existing text and draft on %s clipboard',
    async mode => {
      const readText = vi.fn<() => Promise<string>>();
      if (mode === 'empty') readText.mockResolvedValue('   ');
      else readText.mockRejectedValue(new Error('Permission denied'));
      vi.stubGlobal('navigator', { clipboard: { readText } });
      const { onChange } = setup();
      fireEvent.change(screen.getByPlaceholderText(/الصق هنا أي نص/), {
        target: { value: catalog },
      });
      fireEvent.click(screen.getByRole('button', { name: 'لصق واستخراج تلقائي' }));
      await waitFor(() => {
        expect(readText).toHaveBeenCalledTimes(1);
      });
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText(/الصق هنا أي نص/)).toHaveValue(catalog);
    }
  );

  it('resets all fields in order without clearing catalog text', () => {
    const { onChange } = setup({ make: 'Toyota', model: 'Corolla', vinOptional: 'KEEP' });
    fireEvent.change(screen.getByPlaceholderText(/الصق هنا أي نص/), { target: { value: catalog } });
    fireEvent.click(screen.getByRole('button', { name: 'تفريغ الحقول' }));
    expect(onChange.mock.calls).toEqual([
      [{ make: '' }],
      [{ model: '' }],
      [{ yearStart: '' }],
      [{ yearEnd: '' }],
      [{ market: 'خليجي' }],
      [{ engine: '' }],
      [{ transmission: 'تماتيك' }],
      [{ drive: 'سنجل' }],
      [{ vinOptional: '' }],
    ]);
    expect(screen.getByPlaceholderText(/الصق هنا أي نص/)).toHaveValue(catalog);
  });
});
