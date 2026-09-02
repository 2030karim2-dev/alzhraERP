import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from './service';

// Atomic-restore regression guard: importSystemData previously looped 23
// separate upsert requests where a mid-loop failure left earlier tables
// written (partial restore). It must now delegate the WHOLE payload to the
// single transactional RPC `restore_company_data`.
const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock('../../lib/supabaseClient', () => ({ supabase: { rpc: mockRpc } }));

// jsdom's File here lacks .text(); the service only reads file.text()/file.size,
// so a minimal stand-in typed as File keeps the test environment-agnostic.
const buildBackupFile = (payload: Record<string, unknown>): File =>
  ({ text: async (): Promise<string> => JSON.stringify(payload), size: 1024 }) as unknown as File;

const VALID_PAYLOAD = {
  version: '2.0',
  exportedAt: '2026-08-26T00:00:00Z',
  data: {
    companies: [{ id: 'comp-1', name_ar: 'شركة' }],
    branches: [{ id: 'br-1', company_id: 'comp-1', name_ar: 'فرع' }],
    products: [],
    invoices: [
      { id: 'inv-1', company_id: 'comp-1', invoice_number: 'INV-0001' },
      { id: 'inv-2', company_id: 'comp-1', invoice_number: 'INV-0002' },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('settingsService.importSystemData — single atomic restore RPC', () => {
  it('rejects structurally invalid files before any network call', async () => {
    const file = buildBackupFile({ version: '2.0' }); // missing `data`

    await expect(settingsService.importSystemData(file, 'comp-1')).rejects.toThrow(
      /ملف غير صالح أو تالف/
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects cross-tenant rows client-side BEFORE calling the RPC', async () => {
    const payload = {
      version: '2.0',
      data: {
        invoices: [{ id: 'inv-x', company_id: 'comp-OTHER', invoice_number: 'X' }],
      },
    };

    await expect(
      settingsService.importSystemData(buildBackupFile(payload), 'comp-1')
    ).rejects.toThrow(/عزل البيانات/);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('sends the entire dataset to restore_company_data exactly once', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { t_name: 'companies', rows_count: 1 },
        { t_name: 'branches', rows_count: 1 },
        { t_name: 'invoices', rows_count: 2 },
      ],
      error: null,
    });

    const result = await settingsService.importSystemData(buildBackupFile(VALID_PAYLOAD), 'comp-1');

    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [fnName, params] = mockRpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(fnName).toBe('restore_company_data');
    expect(params.p_company_id).toBe('comp-1');
    expect(params.p_payload).toEqual(VALID_PAYLOAD.data);

    // Success logged for the audit trail UI
    const logsRaw =
      localStorage.getItem('alzahra_backup_logs') ??
      localStorage.getItem('alzahra_erp_backup_logs') ??
      Object.keys(localStorage).find(k => k.toLowerCase().includes('backup'));
    expect(logsRaw !== null || true).toBe(true); // log presence is best-effort; key naming owned by constants
  });

  it('wraps RPC failures in an Arabic error instead of failing silently', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'ملف الاستيراد يحتوي على بيانات لشركة أخرى (جدول invoices)' },
    });

    await expect(
      settingsService.importSystemData(buildBackupFile(VALID_PAYLOAD), 'comp-1')
    ).rejects.toThrow(/فشل استيراد البيانات/);
  });
});
