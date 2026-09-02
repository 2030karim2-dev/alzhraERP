import { describe, it, expect, vi, beforeEach } from 'vitest';
import { journalsApi } from './journalsApi';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { rpc: vi.fn() } }));

vi.mock('../../../lib/supabaseClient', () => ({ supabase: supabaseMock }));

describe('journalsApi.postJournalEntryRPC', () => {
  const companyId = 'company-123';
  const userId = 'user-456';
  const accountA = 'aaaaaaaa-0000-0000-0000-000000000001';
  const accountB = 'bbbbbbbb-0000-0000-0000-000000000002';

  const baseInput = {
    date: '2026-01-15',
    description: 'قيد اختبار',
    lines: [
      { account_id: accountA, debit: 100, credit: 0, description: 'Dr' },
      { account_id: accountB, debit: 0, credit: 100, description: 'Cr' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.rpc.mockResolvedValue({ data: 'journal-1', error: null });
  });

  it('posts a balanced journal and maps the fields to the RPC payload', async () => {
    const id = await journalsApi.postJournalEntryRPC(companyId, userId, baseInput);

    expect(id).toBe('journal-1');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('post_manual_journal', {
      p_company_id: companyId,
      p_user_id: userId,
      p_date: '2026-01-15',
      p_description: 'قيد اختبار',
      p_reference_type: 'manual',
      p_currency_code: 'SAR',
      p_exchange_rate: 1,
      p_lines: [
        { account_id: accountA, party_id: null, debit: 100, credit: 0, description: 'Dr' },
        { account_id: accountB, party_id: null, debit: 0, credit: 100, description: 'Cr' },
      ],
    });
  });

  it('forwards the exchange rate into the RPC payload (R3)', async () => {
    await journalsApi.postJournalEntryRPC(companyId, userId, { ...baseInput, exchange_rate: 2.5 });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'post_manual_journal',
      expect.objectContaining({ p_exchange_rate: 2.5 })
    );
  });

  it('forwards branchId when provided', async () => {
    await journalsApi.postJournalEntryRPC(companyId, userId, { ...baseInput, branchId: 'b1' });

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      'post_manual_journal',
      expect.objectContaining({ p_branch_id: 'b1' })
    );
  });

  it('rejects a zero-amount journal before calling the RPC (R2)', async () => {
    await expect(
      journalsApi.postJournalEntryRPC(companyId, userId, {
        ...baseInput,
        lines: [
          { account_id: accountA, debit: 0, credit: 0 },
          { account_id: accountB, debit: 0, credit: 0 },
        ],
      })
    ).rejects.toThrow('مبلغ صفري');

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('rejects a non-positive exchange rate before calling the RPC (R3)', async () => {
    await expect(
      journalsApi.postJournalEntryRPC(companyId, userId, {
        ...baseInput,
        exchange_rate: 0,
      })
    ).rejects.toThrow('سعر صرف');

    await expect(
      journalsApi.postJournalEntryRPC(companyId, userId, {
        ...baseInput,
        exchange_rate: -1,
      })
    ).rejects.toThrow('سعر صرف');

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('rejects an unbalanced journal before calling the RPC', async () => {
    await expect(
      journalsApi.postJournalEntryRPC(companyId, userId, {
        ...baseInput,
        lines: [
          { account_id: accountA, debit: 100, credit: 0 },
          { account_id: accountB, debit: 0, credit: 150 },
        ],
      })
    ).rejects.toThrow('غير متوازن');

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it('throws the parsed error when the server rejects the journal', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: 'القيد غير متوازن: ...' } });

    await expect(journalsApi.postJournalEntryRPC(companyId, userId, baseInput)).rejects.toThrow(
      'القيد غير متوازن'
    );
  });
});
