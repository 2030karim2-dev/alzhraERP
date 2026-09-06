import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatService } from './chatService';
import { logger } from '../../../core/utils/logger';

// ── Mock supabase client — سلسلة استعلام PostgREST قابلة للتسلسل ─────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

interface MockQueryResult {
  data: unknown;
  error: { code?: string; message: string; details?: string } | null;
}

/** سلسلة استعلام وهمية: كل باني تُعيد السلسلة، و `.limit()` هي النهاية الحالّة. */
const buildQueryChain = (result: MockQueryResult) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'or', 'ilike', 'order']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.limit = vi.fn(() => Promise.resolve(result));
  return chain;
};

type CaughtErr = (Error & { code?: string }) | null;

const catchErr = (promise: Promise<unknown>): Promise<CaughtErr> =>
  promise.then(
    () => null,
    (e: unknown) => e as CaughtErr
  );

describe('chatService — بحث مشاركة الكيانات (Entity Share)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('يعيد [] لمصطلح فارغ دون أي استعلام من الخادم', async () => {
      const result = await chatService.searchProducts('comp-1', '   ');

      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('يجمع مخزون المستودعات ويحوّل الصفوف الخام مع فلترة company_id', async () => {
      const chain = buildQueryChain({
        data: [
          {
            id: 'p1',
            name_ar: 'فلتر زيت',
            part_number: '90915',
            sku: 'SKU-1',
            brand: 'Toyota',
            sale_price: '25.5',
            product_stock: [{ quantity: 2 }, { quantity: 3 }],
          },
        ],
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const result = await chatService.searchProducts('comp-1', 'فلتر');

      expect(mockFrom).toHaveBeenCalledWith('products');
      expect(chain.eq).toHaveBeenCalledWith('company_id', 'comp-1');
      expect(chain.or).toHaveBeenCalledTimes(1);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual([
        {
          id: 'p1',
          name: 'فلتر زيت',
          part_number: '90915',
          brand: 'Toyota',
          sale_price: 25.5,
          total_stock: 5,
          stock: 5,
        },
      ]);
    });

    it('يرمي AppError برسالة الصلاحيات العربية عند رفض الخادم 42501 (سلامة الرفض)', async () => {
      mockFrom.mockReturnValue(
        buildQueryChain({ data: null, error: { code: '42501', message: 'permission denied' } })
      );
      const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined);

      const err = await catchErr(chatService.searchProducts('comp-1', 'فلتر'));

      expect(err).toBeInstanceOf(Error);
      expect(err?.code).toBe('42501');
      expect(err?.message).toBe('عذراً، لا تمتلك الصلاحيات الكافية لتنفيذ هذه العملية.');
      expect(errorSpy).toHaveBeenCalledWith('ChatService', expect.any(String), expect.anything());
      errorSpy.mockRestore();
    });

    it('يرمي خطأ مُفسَّراً (وليس الخام) عند فشل عام، ويسجل عبر logger', async () => {
      mockFrom.mockReturnValue(
        buildQueryChain({
          data: null,
          error: { code: 'XX999', message: 'weird internal database failure' },
        })
      );
      const errorSpy = vi.spyOn(logger, 'error').mockReturnValue(undefined);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const err = await catchErr(chatService.searchProducts('comp-1', 'فلتر'));

      expect(err?.message).toBe('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
      expect(err?.message).not.toContain('weird internal');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('searchInvoices', () => {
    it('يحوّل الفواتير مع الاسم الاحتياطي للطرف حسب النوع', async () => {
      const chain = buildQueryChain({
        data: [
          {
            id: 'inv-1',
            invoice_number: 'INV-100',
            total_amount: 1500,
            created_at: '2026-09-05T10:00:00Z',
            status: 'paid',
            type: 'purchase',
            party: { name: null },
          },
        ],
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const result = await chatService.searchInvoices('comp-1', 'INV');

      expect(mockFrom).toHaveBeenCalledWith('invoices');
      expect(chain.ilike).toHaveBeenCalledWith('invoice_number', '%INV%');
      expect(result).toEqual([
        {
          id: 'inv-1',
          invoice_number: 'INV-100',
          total: 1500,
          customer_name: 'مورد',
          status: 'paid',
          created_at: '2026-09-05T10:00:00Z',
        },
      ]);
    });

    it('يرمي AppError برسالة الصلاحيات عند 42501 بدلاً من إرجاع [] صامتة', async () => {
      mockFrom.mockReturnValue(
        buildQueryChain({ data: null, error: { code: '42501', message: 'permission denied' } })
      );
      vi.spyOn(logger, 'error').mockReturnValue(undefined);

      const err = await catchErr(chatService.searchInvoices('comp-1', 'INV'));

      expect(err?.message).toBe('عذراً، لا تمتلك الصلاحيات الكافية لتنفيذ هذه العملية.');
    });
  });

  describe('searchTransfers', () => {
    it('يحوّل التحويلات مع أسماء المستودعات ورقم مشتق من المعرّف', async () => {
      const chain = buildQueryChain({
        data: [
          {
            id: 'a1b2c3d4e5f6',
            status: 'completed',
            created_at: '2026-09-05T08:00:00Z',
            from_warehouse: { name_ar: 'المستودع الرئيسي' },
            to_warehouse: { name_ar: 'مستودع الفرع' },
          },
        ],
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const result = await chatService.searchTransfers('comp-1', 'x');

      expect(mockFrom).toHaveBeenCalledWith('stock_transfers');
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([
        {
          id: 'a1b2c3d4e5f6',
          transfer_number: 'A1B2C3D4',
          status: 'completed',
          from_warehouse: 'المستودع الرئيسي',
          to_warehouse: 'مستودع الفرع',
          created_at: '2026-09-05T08:00:00Z',
        },
      ]);
    });

    it('يرمي خطأً عند فشل الاستعلام بدلاً من الابتلاع الصامت', async () => {
      mockFrom.mockReturnValue(
        buildQueryChain({ data: null, error: { code: '42501', message: 'permission denied' } })
      );
      vi.spyOn(logger, 'error').mockReturnValue(undefined);

      await expect(chatService.searchTransfers('comp-1', 'x')).rejects.toBeInstanceOf(Error);
    });
  });

  describe('searchVins', () => {
    it('يمرر صفوف تحليلات الشاصي كما هي عند النجاح', async () => {
      const rows = [{ id: 'v1', vin: 'JT3HN87R0X1234', vehicle_id: 'veh-1', decoded: true }];
      const chain = buildQueryChain({ data: rows, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await chatService.searchVins('comp-1', 'JT3');

      expect(mockFrom).toHaveBeenCalledWith('vin_analyses');
      expect(chain.ilike).toHaveBeenCalledWith('vin', '%JT3%');
      expect(result).toEqual(rows);
    });

    it('يرمي AppError برسالة الصلاحيات عند 42501', async () => {
      mockFrom.mockReturnValue(
        buildQueryChain({ data: null, error: { code: '42501', message: 'permission denied' } })
      );
      vi.spyOn(logger, 'error').mockReturnValue(undefined);

      const err = await catchErr(chatService.searchVins('comp-1', 'JT3'));

      expect(err?.message).toBe('عذراً، لا تمتلك الصلاحيات الكافية لتنفيذ هذه العملية.');
    });
  });
});
