import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './api';

// ── Mock supabase client ──────────────────────────────────────────────────────
// Replicates @supabase/supabase-js v2 behaviour: `SupabaseClient.rpc()` reads
// `this.rest` internally. If the method is extracted into a standalone variable
// (`const rpc = supabase.rpc; rpc(...)`) then `this` is undefined and the call
// throws `TypeError: Cannot read properties of undefined (reading 'rest')`.
//
// `mockRpc` is the wrapper that reproduces that behaviour; `mockRpcResult` is
// the configurable inner response used by the wrapper (tests set it via
// mockResolvedValue/mockReturnValue).
const { mockRpc, mockRpcResult, mockFrom, mockGetUser } = vi.hoisted(() => {
    const mockRpcResult = vi.fn();
    const mockRpc = vi.fn(function (this: { rest?: unknown }) {
        // The `this.rest` access mirrors supabase-js's `this.rest.rpc(...)`:
        // when the method is invoked detached, `this` is undefined and the
        // `this.rest` read below throws the exact production TypeError.
        if (this.rest === undefined || this.rest === null) {
            throw new TypeError("Cannot read properties of undefined (reading 'rest')");
        }
        return Promise.resolve(mockRpcResult());
    });
    const mockFrom = vi.fn();
    const mockGetUser = vi.fn();
    return { mockRpc, mockRpcResult, mockFrom, mockGetUser };
});

vi.mock('../../lib/supabaseClient', () => ({
    supabase: {
        // Simulates the PostgrestClient instance SupabaseClient holds as `rest`.
        rest: { rpc: vi.fn() },
        rpc: mockRpc,
        from: mockFrom,
        auth: { getUser: mockGetUser },
    },
}));

describe('authApi.getProfile', () => {
    const userId = '0b2f21d4-8e0a-43bb-9043-e664c1c04e8c';
    const companyId = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

    beforeEach(() => {
        vi.clearAllMocks();
        mockRpcResult.mockResolvedValue({ data: null, error: null });
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    });

    it('resolves the profile from the get_user_profile RPC (called as a bound method)', async () => {
        mockRpcResult.mockResolvedValue({
            data: {
                id: userId,
                full_name: 'أحمد محمد',
                avatar_url: 'https://example.com/a.png',
                companies: [
                    {
                        role: 'admin',
                        company_id: companyId,
                        company_name: 'شركتي',
                        branch_id: 'branch-1',
                        branch_name: 'الفرع الرئيسي',
                    },
                ],
            },
            error: null,
        });
        mockGetUser.mockResolvedValue({
            data: {
                user: {
                    email: 'owner@example.com',
                    user_metadata: { full_name: 'أحمد محمد', avatar_url: 'meta-avatar' },
                },
            },
            error: null,
        });

        const result = await authApi.getProfile(userId);

        // Regression guard: supabase.rpc must be invoked as a method on the
        // client. If it is extracted and called detached, `this` is lost and
        // supabase-js throws "Cannot read properties of undefined (reading 'rest')".
        expect(mockRpc).toHaveBeenCalledWith('get_user_profile', { p_user_id: userId });
        expect(result.error).toBeNull();
        expect(result.data).toEqual({
            id: userId,
            email: 'owner@example.com',
            full_name: 'أحمد محمد',
            avatar_url: 'https://example.com/a.png',
            role: 'admin',
            company_id: companyId,
            company_name: 'شركتي',
            branch_id: 'branch-1',
            branch_name: 'الفرع الرئيسي',
        });
    });

    it('falls back to the manual query chain when the RPC fails', async () => {
        mockRpcResult.mockResolvedValue({
            data: null,
            error: Object.assign(new Error('function get_user_profile does not exist'), {
                code: 'PGRST202',
                details: 'No function matches the given name',
            }),
        });

        const profileRow = { id: userId, full_name: 'محمود علي', avatar_url: 'https://example.com/m.png' };
        const roleRow = {
            role: 'manager',
            company_id: companyId,
            branch_id: 'branch-2',
            companies: { name_ar: 'شركتي' },
            branches: { name: 'فرع جدة' },
        };
        const buildQuery = (row: unknown) => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: row, error: null }),
                    limit: vi.fn(() => ({
                        maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
                    })),
                })),
            })),
        });
        mockFrom.mockImplementation((table: string) =>
            table === 'profiles' ? buildQuery(profileRow) : buildQuery(roleRow)
        );
        mockGetUser.mockResolvedValue({
            data: { user: { email: 'manager@example.com' } },
            error: null,
        });

        const result = await authApi.getProfile(userId);

        expect(result.error).toBeNull();
        expect(result.data).toEqual({
            id: userId,
            email: 'manager@example.com',
            full_name: 'محمود علي',
            avatar_url: 'https://example.com/m.png',
            role: 'manager',
            company_id: companyId,
            company_name: 'شركتي',
            branch_id: 'branch-2',
            branch_name: 'فرع جدة',
        });
    });

    it('deduplicates in-flight profile requests for the same user', async () => {
        let resolveRpc!: (value: unknown) => void;
        mockRpcResult.mockReturnValue(
            new Promise<unknown>(resolve => {
                resolveRpc = resolve;
            })
        );

        const first = authApi.getProfile(userId);
        const second = authApi.getProfile(userId);

        // The second call must reuse the in-flight request: the underlying
        // promise (and therefore its resolved value) is shared, so both
        // awaited results are the same object reference.
        expect(mockRpc).toHaveBeenCalledTimes(1);

        resolveRpc({
            data: {
                id: userId,
                full_name: 'أحمد محمد',
                companies: [{ role: 'admin', company_id: companyId, company_name: 'شركتي' }],
            },
            error: null,
        });

        const r1 = await first;
        const r2 = await second;
        expect(r1).toBe(r2);
        expect(r1.error).toBeNull();
    });
});


