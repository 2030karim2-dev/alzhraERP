
import { supabase } from '../../lib/supabaseClient';
import { PartyFormData, PartyType } from './types';
import { mapToInsert, mapToUpdate } from '../../core/utils/supabaseMappers';


/**
 * واجهة التفاعل مع جدول العملاء والموردين
 * تتبع هيكلية قاعدة البيانات v2.0
 */
export const partiesApi = {
  getParties: async (companyId: string, type: PartyType) => {
    return await supabase.from('active_parties')
      .select('*, party_categories(id, name)')
      .eq('company_id', companyId)
      .eq('type', type)
      .order('name', { ascending: true });
  },

  createParty: async (data: PartyFormData, companyId: string) => {
    const extended = data as unknown as Record<string, unknown>;

    const insertPayload = mapToInsert<'parties'>({
      company_id: companyId,
      type: data.type,
      name: data.name,
      phone: data.phone || null,
      email: (extended.email as string) || null,
      tax_number: (extended.tax_number as string) || null,
      address: (extended.address as string) || null,
      status: (extended.status as string) || 'active',
      category_id: (extended.category_id as string) || null
    });
    return await supabase.from('parties').insert(insertPayload).select().single();
  },

  updateParty: async (id: string, data: PartyFormData) => {
    const extended = data as unknown as Record<string, unknown>;

    const updatePayload = mapToUpdate<'parties'>({
      type: data.type,
      name: data.name,
      phone: data.phone || null,
      email: (extended.email as string) || null,
      tax_number: (extended.tax_number as string) || null,
      address: (extended.address as string) || null,
      status: (extended.status as string) || 'active',
      category_id: (extended.category_id as string) || null
    });
    return await supabase.from('parties').update(updatePayload).eq('id', id).select().single();
  },

  deleteParty: async (id: string) => {
    // Safety check: prevent deleting parties with existing invoices
    const { count, error: checkError } = await supabase.from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('party_id', id);
    if (checkError) throw checkError;
    if (count && count > 0) {
      throw new Error('لا يمكن حذف طرف له فواتير مرتبطة. قم بحظره بدلاً من حذفه.');
    }
    return await supabase.from('parties').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },

  search: async (companyId: string, type: PartyType, query: string) => {
    const sanitized = query.replace(/[%_\\*()]/g, '');
    if (!sanitized.trim()) return { data: [], error: null };
    return await supabase.from('parties')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', type)
      .is('deleted_at', null)
      .textSearch('search_vector', query, {
        config: 'simple',
        type: 'plain'
      })
      .limit(10);
  },

  getTransactionDetails: async (partyId: string) => {
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, total_amount, type, status, payment_method, currency_code, exchange_rate')
      .eq('party_id', partyId)
      .order('issue_date', { ascending: true });

    if (invError) throw invError;

    const { data: payments, error: payError } = await supabase.from('payments')
      .select('id, payment_number, payment_date, amount, type, notes, currency_code, exchange_rate')
      .eq('party_id', partyId)
      .neq('status', 'void')
      .is('deleted_at', null)
      .order('payment_date', { ascending: true });

    if (payError) throw payError;

    const { data: journalLines, error: journalError } = await supabase
      .from('journal_entry_lines')
      .select(`
        id, description, debit_amount, credit_amount, currency_code, exchange_rate,
        journal_entries(id, entry_date, entry_number, reference_type, reference_id),
        account:accounts(id, code, type)
      `)
      .eq('party_id', partyId)
      .is('deleted_at', null);

    if (journalError) throw journalError;

    return { invoices, payments, journalLines };
  }
};

export { customerApi } from './api/enhanced/customerApi';
