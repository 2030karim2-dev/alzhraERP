
import { salesApi } from './api/index';
import { CreateInvoiceDTO, InvoiceResponse } from './types';
import { messagingService } from '../notifications/messagingService';
import { toBaseCurrency } from '../../core/utils/currencyUtils';
import { validateSalePayload, assertValid } from '../../core/utils/validationUtils';
import { routeToChildByCurrency } from '../../core/utils/accountRouting';
import { logger } from '../../core/utils/logger';
import { accountsService } from '../accounting/services/accountsService';
import { supabase } from '../../lib/supabaseClient';

// Constants (These should eventually be migrated to an i18n translation file e.g., t('cash_customer'))
const CASH_CUSTOMER_LABEL = 'عميل نقدي';

// Type for raw invoice data from Supabase
interface RawInvoice {
  id: string;
  invoice_number: string | null;
  party: { name?: string } | null;
  issue_date: string;
  total_amount: number | null;
  status: string;
  type: string;
  payment_method: string | null;
  currency_code: string | null;
  exchange_rate: number | null;
  invoice_items: unknown[] | null;
  reference_invoice_id: string | null;
}

export const salesService = {
  fetchSalesLog: async (companyId: string, page: number = 0, branchId?: string | null) => {
    try {
      const data = await salesApi.getInvoices(companyId, page, 50, branchId);
      return (data || []).map((inv: unknown) => {
        const _inv = inv as RawInvoice;
        return {
          id: _inv.id,
          invoiceNumber: _inv.invoice_number,
          customerName: _inv.party?.name || CASH_CUSTOMER_LABEL,
          date: new Date(_inv.issue_date).toLocaleDateString('en-GB'),
          total: Number(_inv.total_amount) || 0,
          baseTotal: toBaseCurrency({
            amount: Number(_inv.total_amount) || 0,
            currency_code: _inv.currency_code || 'SAR',
            exchange_rate: Number(_inv.exchange_rate) || 1
          }),
          status: _inv.status,
          type: _inv.type,
          paymentMethod: _inv.payment_method,
          currencyCode: _inv.currency_code || 'SAR',
          exchangeRate: Number(_inv.exchange_rate) || 1,
          itemCount: Array.isArray(_inv.invoice_items) ? _inv.invoice_items.length : 0,
          referenceInvoiceId: _inv.reference_invoice_id
        };
      });
    } catch (error) {
      logger.error('SalesService', 'Failed to fetch sales log', { companyId, error });
      throw error;
    }
  },

  processNewSale: async (companyId: string, userId: string, payload: CreateInvoiceDTO) => {
    // H6: Validate items before sending to RPC
    assertValid(validateSalePayload({
      items: payload.items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      paymentMethod: payload.paymentMethod
    }));

    if (payload.type === 'return_sale') {
      return await salesApi.commitReturnRPC(companyId, userId, payload);
    }

    let finalTreasuryAccountId = payload.treasuryAccountId;

    // M1: Use shared smart routing utility
    if (finalTreasuryAccountId && payload.currency) {
      const accounts = await accountsService.getAccounts(companyId);
      // 3. Resolve actual treasury account using the multi-currency router
      const routed = routeToChildByCurrency(accounts as unknown as import('../../core/utils/accountRouting').RoutableAccount[], finalTreasuryAccountId, payload.currency);
      if (routed) {
        finalTreasuryAccountId = routed.id;
      }
    }

    const { treasuryAccountId, ...restPayload } = payload;
    const enhancedPayload = {
      ...restPayload,
      ...(finalTreasuryAccountId ? { treasuryAccountId: finalTreasuryAccountId } : {})
    };
    const result = await salesApi.commitInvoiceRPC(companyId, userId, enhancedPayload);

    // 🔔 Fire-and-forget notification
    if (result) {
      const itemsTotal = payload.items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
      const typedResult = result as InvoiceResponse;
      messagingService.notify(companyId, 'sale', {
        invoiceNumber: typedResult.invoice_number || '',
        customerName: payload.customerName || CASH_CUSTOMER_LABEL, // [FIX] استخدام اسم العميل المُمرر
        amount: itemsTotal,
        currency: payload.currency || 'SAR',
        date: new Date().toLocaleDateString('en-GB'),
        paymentMethod: payload.paymentMethod || 'cash',
        itemCount: payload.items?.length || 0,
      }, typedResult.id);
    }

    return result;
  },

  // ⚡ Client-side stats computation via direct query
  // [FIX] Uses rolling 30-day window instead of current calendar month to prevent
  // stats showing all-zero when the month just started. Also filters voided invoices.
  getStats: async (companyId: string, branchId?: string | null) => {
    const today = new Date();
    // Rolling 30-day window
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const startOfThisWindow = isoDate(thirtyDaysAgo);
    const startOfPrevWindow = isoDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate() - 29));
    const endOfPrevWindow = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));

    try {
      // Query this period's invoices (last 30 days) — exclude voided and deleted
      let queryThisWindow = supabase
        .from('invoices')
        .select('total_amount, currency_code, exchange_rate')
        .eq('company_id', companyId)
        .eq('type', 'sale')
        .neq('status', 'void')
        .is('deleted_at', null)
        .gte('issue_date', startOfThisWindow);

      if (branchId) {
        queryThisWindow = queryThisWindow.eq('branch_id', branchId);
      }

      const { data: thisWindowData, error: thisWindowError } = await queryThisWindow;
      if (thisWindowError) throw thisWindowError;

      // Query previous 30-day period for growth comparison — also exclude voided
      let queryPrevWindow = supabase
        .from('invoices')
        .select('total_amount, currency_code, exchange_rate')
        .eq('company_id', companyId)
        .eq('type', 'sale')
        .neq('status', 'void')
        .is('deleted_at', null)
        .gte('issue_date', startOfPrevWindow)
        .lte('issue_date', endOfPrevWindow);

      if (branchId) {
        queryPrevWindow = queryPrevWindow.eq('branch_id', branchId);
      }

      const { data: prevWindowData, error: prevWindowError } = await queryPrevWindow;
      if (prevWindowError) throw prevWindowError;

      // Calculate totals, converting to base currency if necessary
      const calcTotal = (data: any[]) => data.reduce((sum, inv) => {
        return sum + toBaseCurrency(inv);
      }, 0);

      const totalSales = calcTotal(thisWindowData || []);
      const invoiceCount = (thisWindowData || []).length;
      const avgSale = invoiceCount > 0 ? totalSales / invoiceCount : 0;

      const prevWindowSales = calcTotal(prevWindowData || []);

      let monthlyGrowth: number | null = null;
      if (prevWindowSales > 0) {
        monthlyGrowth = ((totalSales - prevWindowSales) / prevWindowSales) * 100;
      }

      return {
        totalSales,
        invoiceCount,
        avgSale,
        monthlyGrowth
      };
    } catch (error) {
      logger.error('SalesService', 'Failed to calculate stats', error);
      return { totalSales: 0, invoiceCount: 0, avgSale: 0, monthlyGrowth: null };
    }
  }
};
