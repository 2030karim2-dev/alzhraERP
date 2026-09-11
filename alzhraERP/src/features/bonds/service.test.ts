import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bondsService } from './service';
import { bondsApi } from './api';

vi.mock('./api', () => ({
  bondsApi: {
    getBonds: vi.fn(),
    createPaymentRPC: vi.fn(),
    deleteBond: vi.fn(),
    getBondsStats: vi.fn(),
  },
}));

vi.mock('../notifications/messagingService', () => ({
  messagingService: { notify: vi.fn() },
}));

vi.mock('../notifications/service', () => ({
  notificationService: { notifyBond: vi.fn() },
}));

describe('bondsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBonds multi-currency handling', () => {
    it('correctly maps SAR bonds with identical amount and base_amount', async () => {
      vi.mocked(bondsApi.getBonds).mockResolvedValueOnce({
        data: [
          {
            id: 'bond-1',
            payment_number: '1001',
            payment_date: '2026-09-10',
            amount: 500,
            currency_code: 'SAR',
            exchange_rate: 1,
            payment_method: 'cash',
            type: 'receipt',
            notes: 'تحصيل نقدي',
            status: 'posted',
            party: { name: 'العميل الأول' },
            account: { name_ar: 'الصندوق الرئيسي', code: '1110' },
          },
        ],
        error: null,
      } as any);

      const result = await bondsService.fetchBonds('comp-1');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(500);
      expect(result[0].base_amount).toBe(500);
      expect(result[0].currency_code).toBe('SAR');
    });

    it('correctly preserves YER amount and computes base_amount in SAR without inverting', async () => {
      // 100,000 YER at rate 410 should be ~243.9 SAR base_amount, while amount remains 100,000
      vi.mocked(bondsApi.getBonds).mockResolvedValueOnce({
        data: [
          {
            id: 'bond-2',
            payment_number: '1002',
            payment_date: '2026-09-10',
            amount: 100000,
            currency_code: 'YER',
            exchange_rate: 410,
            payment_method: 'cash',
            type: 'receipt',
            notes: 'سند قبض بالريال اليمني',
            status: 'posted',
            party: { name: 'عميل صنعاء' },
            account: { name_ar: 'صندوق الريال اليمني', code: '1111' },
          },
        ],
        error: null,
      } as any);

      const result = await bondsService.fetchBonds('comp-1');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(100000);
      expect(result[0].currency_code).toBe('YER');
      expect(result[0].base_amount).toBeCloseTo(243.9, 1);
    });

    it('correctly preserves USD amount and computes base_amount in SAR with multiplication', async () => {
      // 100 USD at rate 3.75 should be 375 SAR base_amount, while amount remains 100
      vi.mocked(bondsApi.getBonds).mockResolvedValueOnce({
        data: [
          {
            id: 'bond-3',
            payment_number: '1003',
            payment_date: '2026-09-10',
            amount: 100,
            currency_code: 'USD',
            exchange_rate: 3.75,
            payment_method: 'bank',
            type: 'disbursement',
            notes: 'سند صرف بالدولار',
            status: 'posted',
            party: { name: 'شركة التوريدات' },
            account: { name_ar: 'حساب بنكي دولار', code: '1121' },
          },
        ],
        error: null,
      } as any);

      const result = await bondsService.fetchBonds('comp-1');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(100);
      expect(result[0].currency_code).toBe('USD');
      expect(result[0].base_amount).toBe(375);
      expect(result[0].type).toBe('payment');
    });
  });
});
