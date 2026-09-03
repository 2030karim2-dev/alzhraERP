/**
 * Omni-Search Service — Unified search across all entities.
 *
 * Provides a single search endpoint that returns results from:
 * - Products (by name, SKU, part_number, OEM)
 * - Customers/Suppliers (by name, phone)
 * - Invoices (by number)
 * - Accounting journals (by description)
 *
 * @module core/services/omniSearchService
 */

import { supabase } from '../../lib/supabaseClient';
import { buildIlikeOrFilter } from '../../core/utils/postgrestFilter';

export interface OmniSearchResult {
  id: string;
  type: 'product' | 'customer' | 'supplier' | 'invoice' | 'journal';
  title: string;
  subtitle: string;
  path: string;
  score: number;
  icon: 'package' | 'user' | 'truck' | 'receipt' | 'file-text';
}

export interface OmniSearchResponse {
  products: OmniSearchResult[];
  customers: OmniSearchResult[];
  suppliers: OmniSearchResult[];
  invoices: OmniSearchResult[];
  journals: OmniSearchResult[];
  total: number;
  all: OmniSearchResult[];
}

export const searchAll = async (companyId: string, query: string): Promise<OmniSearchResponse> => {
  const term = query.trim();
  if (!term || term.length < 2) {
    return {
      products: [],
      customers: [],
      suppliers: [],
      invoices: [],
      journals: [],
      total: 0,
      all: [],
    };
  }

  const searchPattern = `%${term}%`;

  const [productsRes, customersRes, suppliersRes, invoicesRes, journalsRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name_ar, sku, part_number, sale_price')
      .eq('company_id', companyId)
      // [FIX] قيمة مقتبسة داخل or() — الفاصلة في مدخل البحث كانت تكسر الفلتر
      // وترمي 400 فيسقط Promise.all ويفشل البحث الشامل كله.
      .or(buildIlikeOrFilter(['name_ar', 'sku', 'part_number'], term))
      .limit(5),
    supabase
      .from('parties')
      .select('id, name, phone')
      .eq('company_id', companyId)
      .eq('type', 'customer')
      .ilike('name', searchPattern)
      .limit(5),
    supabase
      .from('parties')
      .select('id, name, phone')
      .eq('company_id', companyId)
      .eq('type', 'supplier')
      .ilike('name', searchPattern)
      .limit(5),
    supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, party:party_id(name)')
      .eq('company_id', companyId)
      // [FIX] ilike مباشرة بدل or() بشرط واحد — نفس السلوك بلا هشاشة الصيغة.
      .ilike('invoice_number', searchPattern)
      .limit(5),
    supabase
      .from('journal_entries')
      .select('id, description, entry_date')
      .eq('company_id', companyId)
      .ilike('description', searchPattern)
      .limit(5),
  ]);

  const mapProducts = (rows: unknown[] | null): OmniSearchResult[] =>
    (rows || []).map((row, i) => {
      const p = row as Record<string, unknown>;
      return {
        id: `product-${p.id as string}`,
        type: 'product' as const,
        title: (p.name_ar as string) || '',
        subtitle: `${p.sku || p.part_number || ''} • ${p.sale_price ? Number(p.sale_price).toLocaleString('en-US') : '0'} ريال`,
        path: `/inventory?search=${encodeURIComponent((p.sku as string) || (p.name_ar as string) || '')}`,
        score: 100 - i,
        icon: 'package' as const,
      };
    });

  const mapParties = (type: 'customer' | 'supplier', rows: unknown[] | null): OmniSearchResult[] =>
    (rows || []).map((row, i) => {
      const c = row as Record<string, unknown>;
      return {
        id: `${type}-${c.id as string}`,
        type,
        title: (c.name as string) || '',
        subtitle: c.phone ? `📞 ${c.phone as string}` : '',
        path: `/parties?id=${c.id as string}`,
        score: 90 - i,
        icon: type === 'customer' ? ('user' as const) : ('truck' as const),
      };
    });

  const mapInvoices = (rows: unknown[] | null): OmniSearchResult[] =>
    (rows || []).map((row, i) => {
      const inv = row as Record<string, unknown>;
      const party = (inv.party as { name?: string } | null) ?? null;
      return {
        id: `invoice-${inv.id as string}`,
        type: 'invoice' as const,
        title: `فاتورة ${(inv.invoice_number as string) || ''}`,
        subtitle: `${party?.name || ''} • ${Number(inv.total_amount || 0).toLocaleString('en-US')} ريال`,
        path: `/sales?id=${inv.id as string}`,
        score: 80 - i,
        icon: 'receipt' as const,
      };
    });

  const mapJournals = (rows: unknown[] | null): OmniSearchResult[] =>
    (rows || []).map((row, i) => {
      const j = row as Record<string, unknown>;
      return {
        id: `journal-${j.id as string}`,
        type: 'journal' as const,
        title: (j.description as string) || '',
        subtitle: j.entry_date
          ? new Date(j.entry_date as string).toLocaleDateString('ar-SA-u-nu-latn')
          : '',
        path: `/accounting?id=${j.id as string}`,
        score: 70 - i,
        icon: 'file-text' as const,
      };
    });

  const products = mapProducts(productsRes.data);
  const customers = mapParties('customer', customersRes.data);
  const suppliers = mapParties('supplier', suppliersRes.data);
  const invoices = mapInvoices(invoicesRes.data);
  const journals = mapJournals(journalsRes.data);

  const all = [...products, ...customers, ...suppliers, ...invoices, ...journals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  return { products, customers, suppliers, invoices, journals, total: all.length, all };
};

export const quickSearch = async (
  companyId: string,
  query: string
): Promise<OmniSearchResult[]> => {
  const resp = await searchAll(companyId, query);
  return resp.all.slice(0, 5);
};
