import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompany } from './hooks';
import { settingsService } from './service';
import { authApi } from '../auth/api';

// Mocked auth store: `useAuthStore()` returns the current user; `setState` is a
// spy so we can assert the self-heal path updates the store with a fresh company.
const store = vi.hoisted(() => ({
  user: { id: 'user-1', company_id: 'stale-comp' },
  setState: vi.fn(),
}));

vi.mock('./service', () => ({
  settingsService: { fetchCompany: vi.fn() },
}));

vi.mock('../auth/api', () => ({
  authApi: { getProfile: vi.fn() },
}));

vi.mock('../auth/store', () => ({
  useAuthStore: Object.assign(() => ({ user: store.user }), { setState: store.setState }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the company row when found (no profile refresh triggered)', async () => {
    vi.mocked(settingsService.fetchCompany).mockResolvedValue({ id: 'stale-comp', name_ar: 'شركتي' });

    const { result } = renderHook(() => useCompany(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 'stale-comp', name_ar: 'شركتي' });
    });
    expect(authApi.getProfile).not.toHaveBeenCalled();
    expect(store.setState).not.toHaveBeenCalled();
  });

  it('self-heals a stale company_id: refreshes the server profile and updates the auth store', async () => {
    vi.mocked(settingsService.fetchCompany).mockResolvedValue(null);
    vi.mocked(authApi.getProfile).mockResolvedValue({
      data: { id: 'user-1', company_id: 'fresh-comp', company_name: 'الشركة الجديدة', role: 'admin' },
      error: null,
    });

    const { result } = renderHook(() => useCompany(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
    expect(authApi.getProfile).toHaveBeenCalledWith('user-1');
    expect(store.setState).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ company_id: 'fresh-comp' }) as unknown,
        isAuthenticated: true,
        isReady: true,
      })
    );
  });

  it('does not touch the auth store when the fresh profile still points to the same (missing) company', async () => {
    vi.mocked(settingsService.fetchCompany).mockResolvedValue(null);
    vi.mocked(authApi.getProfile).mockResolvedValue({
      data: { id: 'user-1', company_id: 'stale-comp' },
      error: null,
    });

    const { result } = renderHook(() => useCompany(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(store.setState).not.toHaveBeenCalled();
  });
});
