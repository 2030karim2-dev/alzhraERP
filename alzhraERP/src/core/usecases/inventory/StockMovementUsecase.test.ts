
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockMovementUsecase } from './StockMovementUsecase';
import { inventoryApi } from '../../../features/inventory/api';
import { costingService } from '../../../features/inventory/services/costingService';
import { supabase } from '../../../lib/supabaseClient';

// Mock dependencies
vi.mock('../../../features/inventory/api', () => ({
  inventoryApi: {
    // Fix: Added missing createInventoryTransactions to mock definition
    createInventoryTransactions: vi.fn(),
  }
}));

vi.mock('../../../features/inventory/services/costingService', () => ({
  costingService: {
    calculateNewAverageCost: vi.fn(),
  }
}));

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    // Required by StockMovementUsecase when processing IN transactions
    rpc: vi.fn().mockResolvedValue({ error: null }),
  }
}));

describe('StockMovementUsecase', () => {
  const mockParams = {
    productId: 'prod-123',
    warehouseId: 'wh-1',
    quantity: 10,
    type: 'IN' as const,
    unitPrice: 50,
    referenceType: 'purchase',
    referenceId: 'ref-1',
    userId: 'user-1',
    companyId: 'comp-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call RPC to calculate weighted average cost on IN transaction', async () => {
    // Mock rpc to succeed
    const rpcFn = vi.fn().mockResolvedValue({ error: null });
    (supabase as unknown as { rpc: ReturnType<typeof vi.fn> }).rpc = rpcFn;

    // Mock inventory API
    (inventoryApi.createInventoryTransactions as ReturnType<typeof vi.fn>)
      .mockResolvedValue({ error: null });

    await StockMovementUsecase.execute(mockParams);

    // Verify the atomic DB RPC was called with correct args
    expect(rpcFn).toHaveBeenCalledWith('calculate_and_update_wac', {
      p_product_id: 'prod-123',
      p_added_qty:  10,
      p_unit_price: 50,
    });
  });

  it('should create inventory transaction record', async () => {
    // Mock minimal supabase response for non-pricing logic
    const singleFn = vi.fn().mockResolvedValue({ data: null }); // Product not found or irrelevant
    const eqFn = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    (supabase.from as any).mockImplementation(() => ({ select: selectFn, update: vi.fn().mockReturnValue({ eq: vi.fn() }) }));

    (inventoryApi.createInventoryTransactions as any).mockResolvedValue({ error: null });

    const outParams = { ...mockParams, type: 'OUT' as const, quantity: -5 };
    await StockMovementUsecase.execute(outParams);

    expect(inventoryApi.createInventoryTransactions).toHaveBeenCalledWith([
      expect.objectContaining({
        product_id: 'prod-123',
        quantity: -5,
        transaction_type: 'sale'
      })
    ]);
  });

  it('should handle errors from inventory API', async () => {
    (inventoryApi.createInventoryTransactions as any).mockResolvedValue({ error: { message: 'DB Error' } });

    // Bypass the product fetch part for this test
    const singleFn = vi.fn().mockResolvedValue({ data: null });
    const eqFn = vi.fn().mockReturnValue({ single: singleFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
    (supabase.from as any).mockImplementation(() => ({ select: selectFn }));

    await expect(StockMovementUsecase.execute({ ...mockParams, type: 'OUT' }))
      .rejects
      .toEqual({ message: 'DB Error' });
  });
});
