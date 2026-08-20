
import { supabase } from '../../lib/supabaseClient';

// Typed result shapes for Supabase queries
interface AccountWithLines {
  id: string;
  code: string;
  name_ar: string;
  type: string;
  balance: number;
  journal_entry_lines?: {
    debit_amount: number;
    credit_amount: number;
    journal_entries: { entry_date: string; status: string };
  }[];
}

interface PartyInvoice {
  invoice_number: string | null;
  issue_date: string;
  total_amount: number | null;
  type: string;
  status: string;
}

interface PartyJournal {
  debit_amount: number | null;
  credit_amount: number | null;
  description: string | null;
  journal_entries: {
    entry_number: number;
    entry_date: string;
    description: string | null;
    status: string;
  };
}

interface JournalLineRaw {
  id: string;
  debit_amount: number;
  credit_amount: number;
  description: string | null;
  account_id: string;
  account: { id: string; code: string; name_ar: string; type: string };
  journal: { id: string; entry_date: string; entry_number: number; status: string; company_id: string };
}

interface PartyWithBalance {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export const reportsApi = {
  /**
   * Fetch accounting data with journal lines
   */
  getAccountingData: async (companyId: string) => {
    const [{ data: accounts }, { data: balances }] = await Promise.all([
      supabase.from('accounts')
        .select(`
          id, code, name_ar, type,
          journal_entry_lines (
            debit_amount, credit_amount,
            journal_entries!inner ( entry_date, status )
          )
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .eq('journal_entry_lines.journal_entries.status', 'posted'),
      supabase.from('account_balances').select('account_id, balance').eq('company_id', companyId)
    ]);

    if (!accounts) return { data: null, error: { message: 'Failed to fetch accounts' } };

    const balanceMap = new Map((balances || []).map((b) => [b.account_id, Number(b.balance)]));

    const merged = accounts.map((a) => ({
      ...a,
      balance: balanceMap.get(a.id) || 0
    }));

    return {
      data: merged as AccountWithLines[],
      error: null
    };
  },

  // استخدام دالة SQL المحسنة لجلب ميزان المراجعة
  getTrialBalanceRPC: async (companyId: string, fromDate: string, toDate: string) => {
    return await supabase.rpc('report_trial_balance', {
      p_company_id: companyId,
      p_from: fromDate,
      p_to: toDate
    });
  },

  // جلب كشف حساب لجهة معينة (عميل أو مورد)
  getPartyLedger: async (partyId: string) => {
    const { data: invoices } = await supabase.from('invoices')
      .select('invoice_number, issue_date, total_amount, type, status')
      .eq('party_id', partyId)
      .neq('status', 'void')
      .order('issue_date', { ascending: true }) as unknown as { data: PartyInvoice[] | null };

    const { data: journals } = await supabase.from('journal_entry_lines')
      .select(`
        debit_amount, credit_amount, description,
        journal_entries!inner ( entry_number, entry_date, description, status )
      `)
      .eq('party_id', partyId)
      .eq('journal_entries.status', 'posted')
      .order('journal_entries(entry_date)', { ascending: true }) as unknown as { data: PartyJournal[] | null };

    return { invoices, journals };
  },

  // جلب البيانات الخام للتقارير المخصصة الأخرى عند الحاجة
  getJournalLinesRaw: async (companyId: string, fromDate?: string, toDate?: string) => {
    let query = supabase.from('journal_entry_lines')
      .select(`
        id, debit_amount, credit_amount, description, account_id,
        account:accounts!inner(id, code, name_ar, type),
        journal:journal_entries!inner(id, entry_date, entry_number, status, company_id)
      `)
      .eq('journal.company_id', companyId)
      .eq('journal.status', 'posted');

    if (fromDate) query = query.gte('journal.entry_date', fromDate);
    if (toDate) query = query.lte('journal.entry_date', toDate);

    return await query as unknown as { data: JournalLineRaw[] | null; error: { message: string } | null };
  },

  getPartiesWithBalances: async (companyId: string) => {
    const [{ data: parties }, { data: balances }] = await Promise.all([
      supabase.from('parties').select('id, name, type').eq('company_id', companyId).is('deleted_at', null),
      supabase.from('party_balances').select('party_id, balance').eq('company_id', companyId)
    ]);
    
    if (!parties) return { data: null, error: { message: 'Failed to fetch parties' } };
    
    const balanceMap = new Map((balances || []).map((b) => [b.party_id, Number(b.balance)]));
    
    const merged = parties.map((p) => ({
      ...p,
      balance: balanceMap.get(p.id) || 0
    }));
    
    return { data: merged as PartyWithBalance[], error: null };
  },

  getCompanyCurrency: async (companyId: string) => {
    return await supabase.from('companies')
      .select('base_currency')
      .eq('id', companyId)
      .single() as unknown as { data: { base_currency: string } | null; error: { message: string } | null };
  },

  getDebtAgingInvoices: async (companyId: string) => {
    return await supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, due_date, total_amount, paid_amount, status, type, party_id, parties(name, type)')
      .eq('company_id', companyId)
      .eq('type', 'sale')
      .is('deleted_at', null)
      .in('status', ['posted', 'partially_paid'])
      .order('due_date', { ascending: true });
  },

  getDailySalesInvoices: async (companyId: string, fromDateISO: string) => {
    return await supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, total_amount, status, type, party_id, parties(name), exchange_rate, currency_code')
      .eq('company_id', companyId)
      .in('type', ['sale', 'sale_return'])
      .is('deleted_at', null)
      .gte('issue_date', fromDateISO)
      .order('issue_date', { ascending: false });
  },

  getOperationalExpensesLines: async (companyId: string, fromDateISO: string) => {
    return await supabase
      .from('journal_entry_lines')
      .select(`
          id, debit_amount, credit_amount, description,
          account:accounts!inner(id, code, name_ar, type),
          journal:journal_entries!inner(id, entry_date, status, company_id)
        `)
      .eq('journal.company_id', companyId)
      .eq('journal.status', 'posted')
      .eq('account.type', 'expense')
      .gte('journal.entry_date', fromDateISO);
  }
};
