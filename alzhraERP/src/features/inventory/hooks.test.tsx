
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProductMutations } from './hooks/index';
import { inventoryService } from './service';
import { useAuthStore } from '../auth/store';

// Mock dependencies
vi.mock('./service', () => ({
  inventoryService: {
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getMinimalProducts: vi.fn(),
    getItemMovement: vi.fn(),
    getInventoryCategories: vi.fn(),
    createCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createTransfer: vi.fn(),
    startAudit: vi.fn()
  }
}));

// Mock Auth Store to provide a fake logged-in user
vi.mock('../auth/store', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', company_id: 'comp-1' }
  })
}));

// Wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Inventory Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProductMutations', () => {
    it('should call inventoryService.createProduct when saveProduct is triggered for new item', async () => {
      const { result } = renderHook(() => useProductMutations(), {
        wrapper: createWrapper(),
      });

      const newProductData: any = { name: 'New Item', sku: '123' };
      
      // Mock successful response
      (inventoryService.createProduct as any).mockResolvedValue({ id: 'new-id', ...newProductData });

      // Trigger mutation
      await result.current.saveProduct({ data: newProductData });

      await waitFor(() => {
        expect(inventoryService.createProduct).toHaveBeenCalledWith(
          newProductData,
          'comp-1',
          'user-1'
        );
      });
    });

    it('should call inventoryService.deleteProduct when deleteProduct is triggered', async () => {
      const { result } = renderHook(() => useProductMutations(), {
        wrapper: createWrapper(),
      });

      (inventoryService.deleteProduct as any).mockResolvedValue(true);

      result.current.deleteProduct('prod-123');

      await waitFor(() => {
        expect(inventoryService.deleteProduct).toHaveBeenCalledWith('prod-123');
      });
    });
  });
});
