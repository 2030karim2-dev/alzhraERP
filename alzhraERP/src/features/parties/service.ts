import { partiesApi } from './api';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../auth/store';
import { parseError } from '../../core/utils/errorUtils';
import type { Party, PartyStats, PartyFormData, PartyType, PartyCategory } from './types';

export interface StatementMovement {
  id: string;
  date: string;
  ref: string;
  desc: string;
  type: string;
  debit: number;
  credit: number;
  currency: string;
  operation_type?: string;
  balance?: number;
}

export const partiesService = {
  getParties: async (companyId: string, type: PartyType): Promise<Party[]> => {
    const { data, error } = await partiesApi.getParties(companyId, type);
    if (error) throw error;
    return (data || []).map((p: Record<string, unknown>) => {
      // party_balances is a joined array — take the first record's balance
      const balanceRecords = p.party_balances as Array<{ balance: number; type: string }> | null;
      const firstRecord = balanceRecords?.[0];
      const balance = firstRecord ? firstRecord.balance : 0;
      return {
        ...p,
        category_id: p.category_id,
        category: (p.party_categories as Record<string, unknown>)?.name || 'عام',
        balance,
        balances_by_currency: (p.balances_by_currency as Party['balances_by_currency']) ?? [],
        status: p.status || 'active',
      };
    }) as Party[];
  },

  // ⚡ Server-side party statement via RPC — no frontend aggregation
  getStatement: async (
    partyId: string,
    _type: PartyType,
    options?: { startDate?: string; endDate?: string }
  ): Promise<StatementMovement[]> => {
    // 1. Get companyId from active unified session
    let companyId = useAuthStore.getState().user?.company_id;

    // Fallback if store is not populated
    if (!companyId) {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (userId) {
        const { data: roles } = await supabase
          .from('user_company_roles')
          .select('company_id')
          .eq('user_id', userId)
          .limit(1);
        companyId = roles?.[0]?.company_id;
      }
    }

    if (!companyId) return [];

    const { data, error } = await supabase.rpc('get_party_statement', {
      p_company_id: companyId,
      p_party_id: partyId,
    });
    if (error) throw error;

    interface RawStatementRpcRow {
      line_id: string;
      entry_date: string;
      ref: string;
      operation_type?: string;
      description: string;
      type: string;
      debit: number | string | null;
      credit: number | string | null;
      currency: string;
      balance: number | string | null;
    }

    const rows = (data as unknown as RawStatementRpcRow[]) || [];
    let mapped = rows.map((m): StatementMovement => ({
      id: m.line_id,
      date: m.entry_date,
      ref: m.ref,
      operation_type: m.operation_type ?? '',
      desc: m.description,
      type: m.type,
      debit: Number(m.debit) || 0,
      credit: Number(m.credit) || 0,
      currency: m.currency,
      balance: Number(m.balance) || 0,
    }));

    if (options?.startDate || options?.endDate) {
      mapped = mapped.filter(row => {
        const rowDate = new Date(row.date);
        const start = options.startDate ? new Date(options.startDate) : null;
        const end = options.endDate ? new Date(options.endDate) : null;
        if (start && rowDate < start) return false;
        if (end && rowDate > end) return false;
        return true;
      });
    }

    return mapped;
  },

  getCategoriesWithStats: async (companyId: string, type: PartyType): Promise<PartyCategory[]> => {
    const { data: categories, error: catError } = await supabase
      .from('party_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', type)
      .order('name', { ascending: true });

    if (catError) throw catError;

    const { data: parties } = await partiesApi.getParties(companyId, type);
    // partiesApi.getParties returns {data, error} but we use it here
    const partyList = Array.isArray(parties) ? parties : [];

    const result = (Array.isArray(categories) ? categories : []).map(
      (cat: Record<string, unknown>) => ({
        id: cat.id as string,
        name: cat.name as string,
        type: cat.type as PartyType,
        count: partyList.filter((p: Record<string, unknown>) => p.category_id === cat.id).length,
      })
    );

    return result;
  },

  calculateStats: (parties: Party[]): PartyStats => {
    const activeCount = parties.filter(p => (p.status ?? 'active') === 'active').length;
    const blockedCount = parties.filter(p => p.status === 'blocked').length;

    const currMap = new Map<string, { total: number; count: number }>();
    for (const p of parties) {
      if (p.balances_by_currency && p.balances_by_currency.length > 0) {
        for (const bc of p.balances_by_currency) {
          if (bc.balance !== 0) {
            const entry = currMap.get(bc.currency) ?? { total: 0, count: 0 };
            entry.total += bc.balance;
            entry.count += 1;
            currMap.set(bc.currency, entry);
          }
        }
      } else if (p.balance !== undefined && p.balance !== 0) {
        const entry = currMap.get('SAR') ?? { total: 0, count: 0 };
        entry.total += p.balance;
        entry.count += 1;
        currMap.set('SAR', entry);
      }
    }

    const byCurrency = Array.from(currMap.entries()).map(([currency, item]) => ({
      currency,
      balance: item.total,
      count: item.count,
    }));

    return {
      totalCount: parties.length,
      totalBalance: parties.reduce((sum, p) => sum + (p.balance ?? 0), 0),
      activeCount,
      blockedCount,
      byCurrency,
    };
  },

  saveParty: async (companyId: string, data: PartyFormData, id?: string) => {
    const trimmedName = (data.name || '').trim();
    if (!trimmedName) throw new Error('الاسم مطلوب');

    const trimmedPhone = (data.phone || '').trim();
    const trimmedTaxNumber = (data.tax_number || '').trim();
    const partyType = data.type || 'customer';
    const typeLabel = partyType === 'customer' ? 'العميل' : 'المورد';
    const relevantTypes = [partyType, 'both'];

    // 1. Check duplicate name for same or overlapping type & company
    let nameQuery = supabase
      .from('parties')
      .select('id, name')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('type', relevantTypes)
      .ilike('name', trimmedName)
      .limit(1);

    if (id) {
      nameQuery = nameQuery.neq('id', id);
    }

    const { data: duplicateName } = await nameQuery;
    if (duplicateName && duplicateName.length > 0) {
      throw new Error(`يوجد ${typeLabel} مسجل مسبقاً بنفس الاسم: "${trimmedName}"`);
    }

    // 2. Check duplicate phone for same or overlapping type & company (if phone provided)
    if (trimmedPhone) {
      let phoneQuery = supabase
        .from('parties')
        .select('id, name, phone')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .in('type', relevantTypes)
        .eq('phone', trimmedPhone)
        .limit(1);

      if (id) {
        phoneQuery = phoneQuery.neq('id', id);
      }

      const { data: duplicatePhone } = await phoneQuery;
      if (duplicatePhone && duplicatePhone.length > 0) {
        throw new Error(
          `رقم الهاتف (${trimmedPhone}) مسجل مسبقاً لـ ${typeLabel}: "${duplicatePhone[0].name}"`
        );
      }
    }

    // 3. Check duplicate tax number (if tax number provided)
    if (trimmedTaxNumber) {
      let taxQuery = supabase
        .from('parties')
        .select('id, name, tax_number')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .eq('tax_number', trimmedTaxNumber)
        .limit(1);

      if (id) {
        taxQuery = taxQuery.neq('id', id);
      }

      const { data: duplicateTax } = await taxQuery;
      if (duplicateTax && duplicateTax.length > 0) {
        throw new Error(
          `الرقم الضريبي (${trimmedTaxNumber}) مسجل مسبقاً للطرف: "${duplicateTax[0].name}"`
        );
      }
    }

    try {
      const sanitizedData: PartyFormData = {
        name: trimmedName,
        type: partyType,
        status: data.status || 'active',
      };
      if (trimmedPhone) sanitizedData.phone = trimmedPhone;
      if (trimmedTaxNumber) sanitizedData.tax_number = trimmedTaxNumber;
      if (data.email?.trim()) sanitizedData.email = data.email.trim();
      if (data.address?.trim()) sanitizedData.address = data.address.trim();
      if (data.category_id) sanitizedData.category_id = data.category_id;
      if (data.category) sanitizedData.category = data.category;

      if (id) {
        const { error } = await partiesApi.updateParty(id, sanitizedData);
        if (error) throw error;
      } else {
        const { error } = await partiesApi.createParty(sanitizedData, companyId);
        if (error) throw error;
      }
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw parseError(error);
      }
      throw error;
    }
  },

  deleteParty: async (id: string) => {
    const { error } = await partiesApi.deleteParty(id);
    if (error) throw error;
  },

  saveCategory: async (companyId: string, data: { name: string; type: PartyType }, id?: string) => {
    try {
      if (id) {
        const { data: result, error } = await supabase
          .from('party_categories')
          .update({ name: data.name })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      }
      const { data: result, error } = await supabase
        .from('party_categories')
        .insert({ company_id: companyId, name: data.name, type: data.type })
        .select()
        .single();
      if (error) throw error;
      return result;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new Error('عذراً، هذا الاسم موجود مسبقاً في قائمة الفئات');
      }
      throw error;
    }
  },

  deleteCategory: async (id: string) => {
    const { error } = await supabase.from('party_categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  search: async (companyId: string, type: PartyType, query: string) => {
    const { data, error } = await partiesApi.search(companyId, type, query);
    if (error) throw error;
    return (data || []) as unknown as Party[];
  },

  getCompanyDetails: async (companyId: string) => {
    const { data, error } = await supabase
      .from('companies')
      .select('name_ar, address, phone, tax_number, logo_url')
      .eq('id', companyId)
      .single();
    if (error) throw error;
    return data;
  },

  getOrCreateGeneralParty: async (companyId: string, type: PartyType): Promise<Party> => {
    const name = type === 'customer' ? 'الزبون العام' : 'المورد العام';
    const { data: searchResults, error: searchError } = await partiesApi.search(
      companyId,
      type,
      name
    );
    if (searchError) throw searchError;

    const existing = (searchResults || []).find((p: Record<string, unknown>) => p.name === name);
    if (existing) return existing as unknown as Party;

    const { data: created, error: createError } = await partiesApi.createParty(
      {
        name,
        type,
        status: 'active',
      },
      companyId
    );

    if (createError) throw createError;
    return created as unknown as Party;
  },
};
