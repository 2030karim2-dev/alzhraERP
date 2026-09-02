import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesApi } from './api';
import { purchasesApi } from '../purchases/api';
import { inventoryService } from '../inventory/service';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('@/lib/supabaseClient', () => ({ supabase: supabaseMock }));

describe('Production Hardening & Fallback Elimination Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('salesApi.deleteInvoice', () => {
    it('calls void_invoice RPC and succeeds without direct table update', async () => {
      supabaseMock.rpc.mockResolvedValue({ data: { success: true }, error: null });

      const result = await salesApi.deleteInvoice('inv-123');

      expect(supabaseMock.rpc).toHaveBeenCalledWith('void_invoice', { p_invoice_id: 'inv-123' });
      expect(supabaseMock.from).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { success: true }, error: null });
    });

    it('throws immediately on RPC failure without falling back to direct table update', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: null,
        error: {
          message: 'fiscal_year_closed: لا يمكن إلغاء فاتورة في سنة مالية مغلقة',
          code: 'P0001',
        },
      });

      await expect(salesApi.deleteInvoice('inv-123')).rejects.toThrow();
      expect(supabaseMock.rpc).toHaveBeenCalledWith('void_invoice', { p_invoice_id: 'inv-123' });
      expect(supabaseMock.from).not.toHaveBeenCalled();
    });
  });

  describe('salesApi.getNextSequence', () => {
    it('returns official sequence from database RPC', async () => {
      supabaseMock.rpc.mockResolvedValue({ data: 'INV-20260825-0001', error: null });

      const result = await salesApi.getNextSequence('comp-1', 'INV');

      expect(supabaseMock.rpc).toHaveBeenCalledWith('get_next_sequence', {
        p_company_id: 'comp-1',
        p_sequence_name: 'INV',
      });
      expect(result).toEqual({ data: 'INV-20260825-0001', error: null });
    });

    it('fails cleanly on database error without fabricating random Date.now strings', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: '57P01' },
      });

      const result = await salesApi.getNextSequence('comp-1', 'INV');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('purchasesApi.deletePurchase', () => {
    it('calls void_invoice RPC and does not execute direct table update', async () => {
      supabaseMock.rpc.mockResolvedValue({ data: { success: true }, error: null });

      const result = await purchasesApi.deletePurchase('pur-123');

      expect(supabaseMock.rpc).toHaveBeenCalledWith('void_invoice', { p_invoice_id: 'pur-123' });
      expect(supabaseMock.from).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { success: true }, error: null });
    });

    it('throws error when void_invoice fails for purchase', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: null,
        error: { message: 'access_denied', code: '42501' },
      });

      await expect(purchasesApi.deletePurchase('pur-123')).rejects.toThrow();
      expect(supabaseMock.from).not.toHaveBeenCalled();
    });
  });

  describe('inventoryService.quickAdjustStock', () => {
    it('delegates to atomic quick_adjust_stock_batch RPC with payload', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: { success: true, adjusted_count: 2 },
        error: null,
      });

      const items = [
        { product_id: 'prod-1', warehouse_id: 'wh-1', quantity: 50 },
        { product_id: 'prod-2', warehouse_id: 'wh-1', quantity: 20 },
      ];

      const result = await inventoryService.quickAdjustStock('comp-1', items, 'user-1');

      expect(supabaseMock.rpc).toHaveBeenCalledWith('quick_adjust_stock_batch', {
        p_company_id: 'comp-1',
        p_items: items,
        p_notes: 'تسوية يدوية سريعة للمخزون',
      });
      expect(result).toEqual({ success: true, adjusted_count: 2 });
    });
  });

  describe('salesApi.commitInvoiceRPC idempotency', () => {
    const basePayload = {
      partyId: 'p-1',
      items: [{ productId: 'pr-1', quantity: 2, unitPrice: 10 }],
      paymentMethod: 'cash' as const,
    };

    it('reuses the caller-supplied idempotency key (stable across double-click / retry)', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: { id: 'inv-1', invoice_number: 'INV-1' },
        error: null,
      });

      const payload = { ...basePayload, idempotencyKey: 'sale_123_abc' };
      await salesApi.commitInvoiceRPC('comp-1', 'user-1', payload);
      await salesApi.commitInvoiceRPC('comp-1', 'user-1', payload);

      const keys = supabaseMock.rpc.mock.calls.map(call => call[1]?.p_idempotency_key);
      expect(keys).toEqual(['sale_123_abc', 'sale_123_abc']);
    });

    it('generates a non-empty fallback key when the caller omits it', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: { id: 'inv-2', invoice_number: 'INV-2' },
        error: null,
      });

      await salesApi.commitInvoiceRPC('comp-1', 'user-1', { ...basePayload });

      const [rpcName, params] = supabaseMock.rpc.mock.calls[0];
      expect(rpcName).toBe('commit_sales_invoice_v2');
      expect(String(params?.p_idempotency_key).length).toBeGreaterThan(0);
    });

    it('generates DIFFERENT fallback keys per call (legacy callers stay unique)', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: { id: 'inv-3', invoice_number: 'INV-3' },
        error: null,
      });

      await salesApi.commitInvoiceRPC('comp-1', 'user-1', { ...basePayload });
      await salesApi.commitInvoiceRPC('comp-1', 'user-1', { ...basePayload });

      const keys = supabaseMock.rpc.mock.calls.map(call => call[1]?.p_idempotency_key);
      expect(new Set(keys).size).toBe(2);
    });
  });
});
