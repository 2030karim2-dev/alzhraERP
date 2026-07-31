
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
        customerName: CASH_CUSTOMER_LABEL, // Target refactoring to extract party name from DB result later
        amount: itemsTotal,
        currency: payload.currency || 'SAR',
        date: new Date().toLocaleDateString('en-GB'),
        paymentMethod: payload.paymentMethod || 'cash',
        itemCount: payload.items?.length || 0,
      }, typedResult.id);
    }

    return result;
  },

  // ⚡ Server-side stats via RPC — no frontend aggregation
  getStats: async (companyId: string) => {
    const { data, error } = await supabase.rpc('get_sales_stats', {
      p_company_id: companyId
    });
    if (error) {
      logger.error('SalesService', 'Failed to fetch sales stats', { companyId, error });
      throw error;
    }
    const result = data as Record<string, number>;
    return {
      totalSales: result.totalSales || 0,
      invoiceCount: result.invoiceCount || 0,
      avgSale: result.avgSale || 0
    };
  }
};
