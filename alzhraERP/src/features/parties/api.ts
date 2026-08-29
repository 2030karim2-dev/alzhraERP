import { supabase } from '../../lib/supabaseClient';
import type { PartyFormData, PartyType } from './types';
import { mapToInsert, mapToUpdate } from '../../core/utils/supabaseMappers';

const toCleanStr = (val: unknown): string | null => {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * واجهة التفاعل مع جدول العملاء والموردين
 * تتبع هيكلية قاعدة البيانات v2.0
 */
async function fetchPartyCurrencies(companyId: string): Promise<Map<string, Array<{ currency: string; balance: number; transaction_count?: number }>>> {
  const { data } = await supabase
    .from('party_balances_by_currency')
    .select('party_id, currency_code, balance, transaction_count')
    .eq('company_id', companyId);

  const map = new Map<string, Array<{ currency: string; balance: number; transaction_count?: number }>>();
  if (data !== null) {
    data.forEach(c => {
      if (typeof c.party_id === 'string' && typeof c.currency_code === 'string') {
        const list = map.get(c.party_id) ?? [];
        const item: { currency: string; balance: number; transaction_count?: number } = {
          currency: c.currency_code,
          balance: Number(c.balance) || 0,
        };
        if (typeof c.transaction_count === 'number') {
          item.transaction_count = c.transaction_count;
        }
        list.push(item);
        map.set(c.party_id, list);
      }
    });
  }
  return map;
}

export const partiesApi = {
  getParties: async (companyId: string, type: PartyType) => {
    const { data: partiesData, error: partiesError } = await supabase
      .from('parties')
      .select('*, party_categories(id, name)')
      .eq('company_id', companyId)
      .eq('type', type)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (partiesError !== null) return { data: null, error: partiesError };
    if (partiesData.length === 0) return { data: [], error: null };

    const { data: balancesData, error: balancesError } = await supabase
      .from('party_balances')
      .select('party_id, balance, type')
      .eq('company_id', companyId)
      .eq('type', type);

    const balancesMap = new Map();
    if (balancesError === null) {
      balancesData.forEach(b => balancesMap.set(b.party_id, b));
    }

    const currencyMap = await fetchPartyCurrencies(companyId);

    const mergedData = partiesData.map(p => ({
      ...p,
      party_balances: balancesMap.has(p.id) ? [balancesMap.get(p.id)] : [],
      balances_by_currency: currencyMap.get(p.id) ?? [],
    }));

    return { data: mergedData, error: null };
  },

  createParty: async (data: PartyFormData, companyId: string) => {
    const extended = data as unknown as Record<string, unknown>;

    const insertPayload = mapToInsert<'parties'>({
      company_id: companyId,
      type: data.type,
      name: data.name,
      phone: toCleanStr(data.phone),
      email: toCleanStr(extended.email),
      tax_number: toCleanStr(extended.tax_number),
      address: toCleanStr(extended.address),
      status: toCleanStr(extended.status) ?? 'active',
      category_id: toCleanStr(extended.category_id),
    });
    return await supabase.from('parties').insert(insertPayload).select().single();
  },

  updateParty: async (id: string, data: PartyFormData) => {
    const extended = data as unknown as Record<string, unknown>;

    const updatePayload = mapToUpdate<'parties'>({
      type: data.type,
      name: data.name,
      phone: toCleanStr(data.phone),
      email: toCleanStr(extended.email),
      tax_number: toCleanStr(extended.tax_number),
      address: toCleanStr(extended.address),
      status: toCleanStr(extended.status) ?? 'active',
      category_id: toCleanStr(extended.category_id),
    });
    return await supabase.from('parties').update(updatePayload).eq('id', id).select().single();
  },

  deleteParty: async (id: string) => {
    // Safety check: prevent deleting parties with existing invoices
    const { count, error: checkError } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('party_id', id);
    if (checkError !== null) throw checkError;
    if (typeof count === 'number' && count > 0) {
      throw new Error('لا يمكن حذف طرف له فواتير مرتبطة. قم بحظره بدلاً من حذفه.');
    }
    return await supabase
      .from('parties')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },

  search: async (companyId: string, type: PartyType, query: string) => {
    const sanitized = query.replace(/[%_\\*()]/g, '');
    if (!sanitized.trim()) return { data: [], error: null };
    return await supabase
      .from('parties')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', type)
      .is('deleted_at', null)
      .textSearch('search_vector', sanitized, {
        config: 'simple',
        type: 'plain',
      })
      .limit(10);
  },

  getTransactionDetails: async (partyId: string) => {
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select(
        'id, invoice_number, issue_date, total_amount, type, status, payment_method, currency_code, exchange_rate'
      )
      .eq('party_id', partyId)
      .order('issue_date', { ascending: true });

    if (invError) throw invError;

    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select(
        'id, payment_number, payment_date, amount, type, notes, currency_code, exchange_rate, payment_method'
      )
      .eq('party_id', partyId)
      .neq('status', 'void')
      .is('deleted_at', null)
      .order('payment_date', { ascending: true });

    if (payError) throw payError;

    const { data: journalLines, error: journalError } = await supabase
      .from('journal_entry_lines')
      .select(
        `
        id, description, debit_amount, credit_amount, currency_code, exchange_rate,
        journal_entries(id, entry_date, entry_number, reference_type, reference_id),
        account:accounts(id, code, type)
      `
      )
      .eq('party_id', partyId)
      .is('deleted_at', null);

    if (journalError) throw journalError;

    return { invoices, payments, journalLines };
  },
};

export { customerApi } from './api/enhanced/customerApi';
