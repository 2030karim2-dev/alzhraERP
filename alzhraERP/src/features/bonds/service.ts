
import { bondsApi } from './api';
import { Bond, BondType, BondFormData } from './types';
import { messagingService } from '../notifications/messagingService';

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
  fetchBonds: async (companyId: string, branchId?: string | null, type?: BondType): Promise<Bond[]> => {
    const { data, error } = await bondsApi.getBonds(companyId, branchId, type);
    if (error) throw error;

    return (data || []).map((p: RawPaymentRow) => {
      // Convention: DB stores `amount` in base currency (SAR).
      // exchange_rate = كم SAR لكل وحدة أجنبية
      // للحصول على المبلغ بالعملة الأجنبية: base_amount / rate
      const isBaseCurrency = !p.currency_code || p.currency_code === 'SAR';
      const foreignAmount = isBaseCurrency
        ? p.amount
        : (p.foreign_amount || (p.amount / (p.exchange_rate || 1)));

      return {
        id: p.id,
        payment_number: p.payment_number || '-',
        date: p.payment_date,
        description: p.notes || '',
        amount: foreignAmount,
        base_amount: Number(p.amount) || 0,
        currency_code: p.currency_code || 'SAR',
        exchange_rate: p.exchange_rate || 1,
        type: p.type as BondType,
        party_name: p.party?.name || '',
        account_name: p.account?.name_ar || p.account?.code || '',
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
      messagingService.notify(companyId, eventType, {
        entryNumber: (resultObj.payment_number as string) || '',
        amount: data.amount || 0,
        currency: data.currency_code || 'SAR',
        description: data.description || '',
        accountName: '',
        date: new Date().toLocaleDateString('ar-SA'),
      }, resultObj.id as string);
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
  }
};
