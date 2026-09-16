import { supabase } from '../../../lib/supabaseClient';
import type {
  PartyCompanionData,
  InvoiceCompanionData,
  ProductCompanionData,
  CurrencyBalanceRow,
} from '../types';

export const accompanyingInfoService = {
  /**
   * جلب كشف المعلومات المرافقة للطرف (عميل / مورد)
   * يطابق تماماً تفصيل العملات: مجموع مدين، مجموع دائن، والرصيد
   */
  fetchPartyInfo: async (
    partyId: string,
    companyId: string
  ): Promise<PartyCompanionData | null> => {
    // 1. بيانات الطرف الأساسية
    const { data: party, error: partyErr } = await supabase
      .from('parties')
      .select('id, name, phone, type, tax_number')
      .eq('id', partyId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (partyErr || !party) {
      return null;
    }

    // 2. جلب حركة الحسابات التابعة للطرف لتجميع المدين والدائن لكل عملة
    const { data: journalRows } = await supabase
      .from('journal_entry_lines')
      .select(
        `
        currency_code,
        debit_amount,
        credit_amount,
        foreign_amount,
        exchange_rate,
        journal_entries!inner(status, deleted_at)
      `
      )
      .eq('company_id', companyId)
      .eq('party_id', partyId)
      .is('deleted_at', null)
      .eq('journal_entries.status', 'posted')
      .is('journal_entries.deleted_at', null);

    // 3. جلب الأرصدة الافتتاحية إن وجدت
    const { data: openingRows } = await supabase
      .from('party_opening_balances')
      .select('currency_code, amount, direction')
      .eq('company_id', companyId)
      .eq('party_id', partyId);

    // تجميع الحركات حسب كل عملة
    const currencyMap = new Map<string, { debit: number; credit: number }>();
    const baseCurrencyTotals = { debit: 0, credit: 0 };

    // تجميع أسطر القيود
    (journalRows || []).forEach(row => {
      const curr = (row.currency_code || 'SAR').toUpperCase().trim();
      const debit = Number(row.debit_amount) || 0;
      const credit = Number(row.credit_amount) || 0;

      // بالعملة الأساسية
      baseCurrencyTotals.debit += debit;
      baseCurrencyTotals.credit += credit;

      // بالعملة الخاصة بالحركة
      const existing = currencyMap.get(curr) || { debit: 0, credit: 0 };
      if (curr === 'SAR') {
        existing.debit += debit;
        existing.credit += credit;
      } else {
        const foreign = Number(row.foreign_amount) || 0;
        if (debit > 0) {
          existing.debit += foreign > 0 ? foreign : debit;
        }
        if (credit > 0) {
          existing.credit += foreign > 0 ? foreign : credit;
        }
      }
      currencyMap.set(curr, existing);
    });

    // تجميع الأرصدة الافتتاحية
    (openingRows || []).forEach(row => {
      const curr = (row.currency_code || 'SAR').toUpperCase().trim();
      const amount = Number(row.amount) || 0;
      const existing = currencyMap.get(curr) || { debit: 0, credit: 0 };
      if (row.direction === 'debit') {
        existing.debit += amount;
        baseCurrencyTotals.debit += amount;
      } else {
        existing.credit += amount;
        baseCurrencyTotals.credit += amount;
      }
      currencyMap.set(curr, existing);
    });

    // بناء قائمة العملات (العملة الأساسية دائماً أولاً)
    const currencies: CurrencyBalanceRow[] = [];

    // العملة الأساسية
    const baseBalance = baseCurrencyTotals.debit - baseCurrencyTotals.credit;
    currencies.push({
      currency_code: 'BASE',
      currency_name: 'العملة الأساسية (ريال سعودي)',
      total_debit: Math.round(baseCurrencyTotals.debit * 100) / 100,
      total_credit: Math.round(baseCurrencyTotals.credit * 100) / 100,
      balance: Math.round(baseBalance * 100) / 100,
      balance_type: baseBalance > 0.001 ? 'debit' : baseBalance < -0.001 ? 'credit' : 'zero',
    });

    // العملات الأجنبية المستخدمة (SAR, YER, USD...)
    currencyMap.forEach((vals, code) => {
      const bal = vals.debit - vals.credit;
      const currencyNames: Record<string, string> = {
        SAR: 'ريال سعودي',
        YER: 'ريال يمني',
        USD: 'دولار أمريكي',
      };
      currencies.push({
        currency_code: code,
        currency_name: currencyNames[code] || code,
        total_debit: Math.round(vals.debit * 100) / 100,
        total_credit: Math.round(vals.credit * 100) / 100,
        balance: Math.round(bal * 100) / 100,
        balance_type: bal > 0.001 ? 'debit' : bal < -0.001 ? 'credit' : 'zero',
      });
    });

    // 4. جلب آخر فواتير للطرف
    const { data: recentInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, total_amount, paid_amount, status')
      .eq('company_id', companyId)
      .eq('party_id', partyId)
      .is('deleted_at', null)
      .order('issue_date', { ascending: false })
      .limit(5);

    return {
      id: party.id,
      name: party.name,
      code: party.id.slice(0, 8),
      phone: party.phone || undefined,
      type: party.type as 'customer' | 'supplier' | 'both',
      tax_number: party.tax_number || undefined,
      credit_limit: undefined,
      payment_terms_days: undefined,
      currencies,
      recent_invoices: (recentInvoices || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number || '',
        issue_date: inv.issue_date,
        total_amount: Number(inv.total_amount) || 0,
        paid_amount: Number(inv.paid_amount) || 0,
        status: inv.status,
      })),
    };
  },

  /**
   * جلب كشف المعلومات المرافقة للفاتورة
   * يطابق تماماً الصورة 2: الفرع، المستودع، العملة، المعادل، الإجمالي، الصافي، الربح...
   */
  fetchInvoiceInfo: async (
    invoiceId: string,
    companyId: string
  ): Promise<InvoiceCompanionData | null> => {
    // 1. جلب رأس الفاتورة مع المستودع والفرع
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select(
        `
        id,
        invoice_number,
        issue_date,
        currency_code,
        exchange_rate,
        payment_method,
        total_amount,
        tax_amount,
        discount_amount,
        paid_amount,
        status,
        type,
        branch:branches(name),
        items:invoice_items(
          quantity,
          unit_price,
          cost_price,
          discount_amount,
          tax_amount,
          total
        )
      `
      )
      .eq('id', invoiceId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (invErr || !inv) {
      return null;
    }

    const items =
      (inv.items as unknown as Array<{
        quantity: number;
        unit_price: number;
        cost_price: number;
        discount_amount: number;
        tax_amount: number;
        total: number;
      }>) || [];

    const itemsCount = items.length;
    let totalQty = 0;
    let totalCost = 0;

    items.forEach(it => {
      const q = Number(it.quantity) || 0;
      totalQty += q;
      totalCost += q * (Number(it.cost_price) || 0);
    });

    // جلب اسم المستودع من حركة المخزون المرتبطة بالفاتورة أو المستودع الافتراضي للشركة
    let warehouseName = 'المحل';
    const { data: invTx } = await supabase
      .from('inventory_transactions')
      .select('warehouse:warehouses(name_ar)')
      .eq('company_id', companyId)
      .eq('reference_id', invoiceId)
      .limit(1)
      .maybeSingle();

    if (invTx?.warehouse && typeof invTx.warehouse === 'object' && 'name_ar' in invTx.warehouse) {
      warehouseName = (invTx.warehouse as { name_ar?: string }).name_ar || 'المحل';
    } else {
      const { data: defaultWh } = await supabase
        .from('warehouses')
        .select('name_ar')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (defaultWh?.name_ar) {
        warehouseName = defaultWh.name_ar;
      }
    }

    const netTotal = Number(inv.total_amount) || 0;
    const discountAmount = Number(inv.discount_amount) || 0;
    const taxAmount = Number(inv.tax_amount) || 0;
    const paidAmount = Number(inv.paid_amount) || 0;
    const subtotal = netTotal + discountAmount - taxAmount;
    const remainingAmount = Math.max(0, netTotal - paidAmount);

    const estimatedProfit = Math.round((netTotal - taxAmount - totalCost) * 100) / 100;
    const profitPercentage = netTotal > 0 ? Math.round((estimatedProfit / netTotal) * 100) : 0;

    const branchName = (inv.branch as { name?: string } | null)?.name || 'الفرع الرئيسي';

    return {
      id: inv.id,
      invoice_number: inv.invoice_number || '',
      branch_name: branchName,
      warehouse_name: warehouseName,
      issue_date: inv.issue_date,
      currency_code: inv.currency_code || 'SAR',
      exchange_rate: Number(inv.exchange_rate) || 1,
      payment_method: inv.payment_method === 'credit' ? 'آجل' : 'نقدي',
      items_count: itemsCount,
      total_quantity: Math.round(totalQty * 100) / 100,
      expenses_amount: 0,
      subtotal: Math.round(subtotal * 100) / 100,
      discount_amount: discountAmount,
      additions_amount: 0,
      tax_amount: taxAmount,
      net_total: netTotal,
      paid_amount: paidAmount,
      remaining_amount: Math.round(remainingAmount * 100) / 100,
      estimated_profit: estimatedProfit,
      profit_percentage: profitPercentage,
    };
  },

  /**
   * جلب كشف المعلومات المرافقة للصنف / القطعة
   * يوضح رقم القطعة، الماركة، أسعار البيع والتكلفة، وتوزيع المخزون عبر المستودعات
   */
  fetchProductInfo: async (
    productId: string,
    companyId: string
  ): Promise<ProductCompanionData | null> => {
    const { data: p, error: pErr } = await supabase
      .from('products')
      .select(
        `
        id,
        name_ar,
        sku,
        part_number,
        brand,
        unit,
        sale_price,
        purchase_price,
        cost_price,
        min_stock_level,
        alternative_numbers,
        stock:product_stock(
          quantity,
          warehouse_id,
          warehouses(
            name_ar,
            branches(name)
          )
        )
      `
      )
      .eq('id', productId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .maybeSingle();

    if (pErr || !p) {
      return null;
    }

    const rawStock =
      (p.stock as unknown as Array<{
        quantity: number;
        warehouse_id: string;
        warehouses?: {
          name_ar?: string;
          branches?: { name?: string } | null;
        } | null;
      }>) || [];

    let totalStock = 0;
    const warehousesStock = rawStock.map(st => {
      const q = Number(st.quantity) || 0;
      totalStock += q;
      return {
        warehouse_id: st.warehouse_id,
        warehouse_name: st.warehouses?.name_ar || 'مستودع',
        branch_name: st.warehouses?.branches?.name || undefined,
        quantity: q,
        min_stock_level: p.min_stock_level ? Number(p.min_stock_level) : undefined,
      };
    });

    const salePrice = Number(p.sale_price) || 0;
    const minAllowedPrice = Math.round(salePrice * 0.7 * 100) / 100;

    let alternatives: string[] = [];
    if (Array.isArray(p.alternative_numbers)) {
      alternatives = p.alternative_numbers.map(String);
    } else if (typeof p.alternative_numbers === 'string') {
      alternatives = p.alternative_numbers.split(/[,;\s]+/).filter(Boolean);
    }

    return {
      id: p.id,
      name_ar: p.name_ar,
      sku: p.sku || undefined,
      part_number: p.part_number || undefined,
      brand: p.brand || undefined,
      unit: p.unit || 'حبة',
      sale_price: salePrice,
      purchase_price: Number(p.purchase_price) || 0,
      cost_price: p.cost_price ? Number(p.cost_price) : undefined,
      min_allowed_price: minAllowedPrice,
      total_stock: Math.round(totalStock * 100) / 100,
      warehouses_stock: warehousesStock,
      alternatives,
    };
  },

  /**
   * بحث سريع عن الأطراف والأصناف والفواتير للنافذة المرافقة
   */
  searchEntities: async (
    q: string,
    companyId: string
  ): Promise<
    Array<{
      type: 'customer' | 'supplier' | 'product' | 'invoice';
      id: string;
      label: string;
      sub?: string | undefined;
    }>
  > => {
    const query = q.trim();
    if (!query || !companyId) return [];

    const list: Array<{
      type: 'customer' | 'supplier' | 'product' | 'invoice';
      id: string;
      label: string;
      sub?: string | undefined;
    }> = [];

    // 1. بحث في العملاء والموردين
    const { data: parties } = await supabase
      .from('parties')
      .select('id, name, type, phone')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(4);

    (parties || []).forEach(p => {
      list.push({
        type: p.type === 'supplier' ? 'supplier' : 'customer',
        id: p.id,
        label: p.name,
        sub: p.phone ? `هاتف: ${p.phone}` : undefined,
      });
    });

    // 2. بحث في المنتجات
    const { data: products } = await supabase
      .from('products')
      .select('id, name_ar, sku, part_number')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .or(`name_ar.ilike.%${query}%,sku.ilike.%${query}%,part_number.ilike.%${query}%`)
      .limit(4);

    (products || []).forEach(pr => {
      list.push({
        type: 'product',
        id: pr.id,
        label: pr.name_ar,
        sub: pr.part_number || pr.sku || undefined,
      });
    });

    return list;
  },
};
