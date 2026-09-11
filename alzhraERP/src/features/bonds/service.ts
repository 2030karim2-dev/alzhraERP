import { bondsApi } from './api';
import type { Bond, BondType, BondFormData } from './types';
import { messagingService } from '../notifications/messagingService';
import { notificationService } from '../notifications/service';
import { toBaseCurrency } from '../../core/utils/currencyUtils';
import { formatLocalDate } from '../../core/utils/dateUtils';
import { logger } from '../../core/utils/logger';

// Raw shape returned by the Supabase join query in bondsApi.getBonds
interface RawPaymentRow {
  id: string;
  payment_number: string | null;
  payment_date: string;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  payment_method: string;
  type: string;
  notes: string | null;
  status: string;
  foreign_amount?: number;
  party?: { name: string } | null;
  account?: { name_ar: string; code: string } | null;
}

export const bondsService = {
  fetchBonds: async (
    companyId: string,
    branchId?: string | null,
    type?: BondType
  ): Promise<Bond[]> => {
    const { data, error } = await bondsApi.getBonds(companyId, branchId, type);
    if (error) throw error;

    return (data || []).map((p: RawPaymentRow) => {
      // payments.amount in DB stores the user-entered transaction amount in p.currency_code.
      const rawAmount = Number(p.amount) || 0;
      const safeRate = Number(p.exchange_rate) > 0 ? Number(p.exchange_rate) : 1;
      let baseAmount = rawAmount;
      try {
        baseAmount = toBaseCurrency({
          amount: rawAmount,
          currency_code: p.currency_code ?? 'SAR',
          exchange_rate: safeRate,
        });
      } catch (err) {
        logger.warn(
          'bondsService',
          'Failed to convert to base currency, fallback to raw amount',
          err
        );
        baseAmount = rawAmount;
      }

      return {
        id: p.id,
        payment_number: p.payment_number ?? '-',
        date: p.payment_date,
        description: p.notes ?? '',
        amount: rawAmount,
        base_amount: baseAmount,
        currency_code: p.currency_code ?? 'SAR',
        exchange_rate: safeRate,
        type: (p.type === 'disbursement' ? 'payment' : p.type) as BondType,
        party_name: p.party?.name ?? '',
        account_name: p.account?.name_ar ?? p.account?.code ?? '',
        status: p.status as Bond['status'],
        payment_method: p.payment_method,
      };
    });
  },

  createBond: async (companyId: string, userId: string, data: BondFormData) => {
    const result = await bondsApi.createPaymentRPC(companyId, userId, data);

    // 🔔 Fire-and-forget notification
    if (result) {
      const eventType = data.type === 'receipt' ? 'bond_receipt' : 'bond_payment';
      const resultObj = result as Record<string, unknown>;
      messagingService.notify(
        companyId,
        eventType,
        {
          entryNumber: (resultObj.payment_number as string) || '',
          amount: data.amount || 0,
          currency: data.currency_code || 'SAR',
          description: data.description || '',
          accountName: '',
          date: formatLocalDate(),
        },
        resultObj.id as string
      );

      // In-App Notification
      notificationService.notifyBond(
        companyId,
        (resultObj.payment_number as string) || '',
        data.type === 'receipt' ? 'receipt' : 'payment',
        data.amount || 0,
        data.currency_code || 'SAR',
        data.description || undefined
      );
    }

    return result;
  },

  deleteBond: async (id: string) => {
    const { error } = await bondsApi.deleteBond(id);
    if (error) throw error;
  },

  getBondsStats: async (companyId: string, branchId?: string | null) => {
    const { data, error } = await bondsApi.getBondsStats(companyId, branchId);
    if (error) throw error;
    return data;
  },
};
