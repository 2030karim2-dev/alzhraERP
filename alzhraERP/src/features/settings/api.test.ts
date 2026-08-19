import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsApi } from './api';

// Mock supabase client with a query-builder chain that mirrors supabase-js v2.
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

describe('settingsApi.getCompany', () => {
  const companyId = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries companies by id with maybeSingle (not single) — regression guard for the 406/PGRST116 storm', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const single = vi.fn();
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle, single })),
      })),
    });

    const result = await settingsApi.getCompany(companyId);

    expect(mockFrom).toHaveBeenCalledWith('companies');
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    expect(single).not.toHaveBeenCalled();
    expect(result).toEqual({ data: null, error: null });
  });

  it('returns the company row when it exists', async () => {
    const companyRow = { id: companyId, name_ar: 'شركتي' };
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: companyRow, error: null }) })),
      })),
    });

    const result = await settingsApi.getCompany(companyId);

    expect(result).toEqual({ data: companyRow, error: null });
    expect(result.error).toBeNull();
  });

  it('resolves to { data: null, error: null } without throwing when no company is visible (the previous 406 case)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
      })),
    });

    const result = await settingsApi.getCompany(companyId);

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});
