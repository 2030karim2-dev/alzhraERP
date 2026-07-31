
import { partiesApi } from './api';
import { supabase } from '../../lib/supabaseClient';
import { Party, PartyStats, PartyFormData, PartyType, PartyCategory } from './types';

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
    return (data || []).map((p: Record<string, unknown>) => ({
      ...p,
      category_id: p.category_id,
      category: (p.party_categories as Record<string, unknown>)?.name || 'عام',
      balance: Number(p.balance) || 0,
      status: p.status || 'active'
    })) as Party[];
  },

  // ⚡ Server-side party statement via RPC — no frontend aggregation
  getStatement: async (partyId: string, _type: PartyType) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || '';
    const { data: role } = await supabase.from('user_company_roles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (!role?.company_id) return [];

    const { data, error } = await supabase.rpc('get_party_statement', {
      p_company_id: role.company_id,
      p_party_id: partyId
    });
    if (error) throw error;

    return ((data as any[]) || []).map((m: any) => ({
      id: m.line_id,
      date: m.entry_date,
      ref: m.ref,
      operation_type: m.operation_type,
      desc: m.description,
      type: m.type,
      debit: Number(m.debit) || 0,
      credit: Number(m.credit) || 0,
      currency: m.currency,
      balance: Number(m.balance) || 0
    })) as StatementMovement[];
  },

  getCategoriesWithStats: async (companyId: string, type: PartyType): Promise<PartyCategory[]> => {
    const { data: categories, error: catError } = await supabase.from('party_categories')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', type)
      .order('name', { ascending: true });

    if (catError) throw catError;

    const { data: parties } = await partiesApi.getParties(companyId, type);
    // partiesApi.getParties returns {data, error} but we use it here
    const partyList = Array.isArray(parties) ? parties : [];

    const result = (Array.isArray(categories) ? categories : []).map((cat: Record<string, unknown>) => ({
      id: cat.id as string,
      name: cat.name as string,
      type: cat.type as PartyType,
      count: partyList.filter((p: Record<string, unknown>) => p.category_id === cat.id).length
    }));

    return result;
  },

  calculateStats: (parties: Party[]): PartyStats => ({
    totalCount: parties.length,
    totalBalance: parties.reduce((sum, p) => sum + (Number(p.balance) || 0), 0),
    activeCount: parties.length,
    blockedCount: 0,
  }),

  saveParty: async (companyId: string, data: PartyFormData, id?: string) => {
    if (!data.name) throw new Error("الاسم مطلوب");
    if (id) {
      const { error } = await partiesApi.updateParty(id, data);
      if (error) throw error;
    } else {
      const { error } = await partiesApi.createParty(data, companyId);
      if (error) throw error;
    }
  },

  deleteParty: async (id: string) => {
    const { error } = await partiesApi.deleteParty(id);
    if (error) throw error;
  },

  saveCategory: async (companyId: string, data: { name: string, type: PartyType }, id?: string) => {
    try {
      if (id) {
        const { data: result, error } = await supabase.from('party_categories')
          .update({ name: data.name })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      }
      const { data: result, error } = await supabase.from('party_categories')
        .insert({ company_id: companyId, name: data.name, type: data.type })
        .select()
        .single();
      if (error) throw error;
      return result;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error("عذراً، هذا الاسم موجود مسبقاً في قائمة الفئات");
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
    const { data: searchResults, error: searchError } = await partiesApi.search(companyId, type, name);
    if (searchError) throw searchError;

    const existing = (searchResults || []).find((p: Record<string, unknown>) => p.name === name);
    if (existing) return existing as unknown as Party;

    const { data: created, error: createError } = await partiesApi.createParty({
      name,
      type,
      status: 'active'
    } as any, companyId);

    if (createError) throw createError;
    return (created as unknown) as Party;
  }
};
