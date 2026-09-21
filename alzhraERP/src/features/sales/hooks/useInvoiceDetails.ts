import { useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, type InvoiceWithDetails } from '@/features/sales/api';
import { useAuthStore } from '@/features/auth/store';

// Shape of a list-level invoice row (partial, from cache)
interface CachedInvoiceRow {
  id?: string;
  invoice_number?: string;
  invoiceNumber?: string;
  total_amount?: number;
  total?: number;
  issue_date?: string;
  date?: string;
  currency_code?: string;
  currencyCode?: string;
  exchange_rate?: number;
  exchangeRate?: number;
  status?: string;
  type?: string;
  payment_method?: string;
  paymentMethod?: string;
  party_id?: string;
  party?: { id?: string; name?: string };
  parties?: { name?: string };
  customerName?: string;
  invoice_items?: InvoiceWithDetails['invoice_items'];
  payment_allocations?: InvoiceWithDetails['payment_allocations'];
}

/** Extract a single field from cache row, preferring snake_case over camelCase */
const pickStr = (a?: string, b?: string, fallback = ''): string => a ?? b ?? fallback;
const pickNum = (a?: number, b?: number, fallback = 0): number => a ?? b ?? fallback;

const mapFoundToDetails = (found: CachedInvoiceRow): InvoiceWithDetails => ({
  ...(found as unknown as InvoiceWithDetails),
  id: found.id ?? '',
  invoice_number: pickStr(found.invoice_number, found.invoiceNumber),
  total_amount: pickNum(found.total_amount, found.total),
  issue_date: pickStr(found.issue_date, found.date),
  currency_code: pickStr(found.currency_code, found.currencyCode, 'SAR'),
  exchange_rate: pickNum(found.exchange_rate, found.exchangeRate, 1),
  status: found.status ?? 'draft',
  type: found.type ?? 'sale',
  payment_method: pickStr(found.payment_method, found.paymentMethod, 'cash'),
  parties: {
    id: found.party_id ?? found.party?.id ?? '',
    name: found.parties?.name ?? found.party?.name ?? found.customerName ?? 'عميل نقدي',
  } as InvoiceWithDetails['parties'],
  invoice_items: found.invoice_items ?? [],
  payment_allocations: found.payment_allocations ?? [],
});

const searchList = (
  list: CachedInvoiceRow[] | undefined,
  invoiceId: string
): InvoiceWithDetails | undefined => {
  if (!Array.isArray(list)) return undefined;
  const found = list.find(inv => inv.id === invoiceId);
  return found != null ? mapFoundToDetails(found) : undefined;
};

export const useInvoiceDetails = (
  invoiceId: string | null
): ReturnType<typeof useQuery<InvoiceWithDetails | null>> => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const companyId = user?.company_id;
  const isEnabled = invoiceId != null && invoiceId !== '';

  return useQuery({
    queryKey: ['invoice_details', invoiceId],
    queryFn: async (): Promise<InvoiceWithDetails | null> => {
      if (!isEnabled) return null;
      return salesApi.getInvoiceDetails(invoiceId, companyId);
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData): InvoiceWithDetails | undefined => {
      if (previousData != null) return previousData;
      if (!isEnabled) return undefined;

      // Seed instant view from existing lists in query cache (sales, returns, etc.)
      const allQueries = queryClient.getQueriesData<CachedInvoiceRow[]>({ queryKey: ['invoices'] });
      for (const [, list] of allQueries) {
        const hit = searchList(list, invoiceId);
        if (hit != null) return hit;
      }

      // Also check sales-returns queries
      const returnQueries = queryClient.getQueriesData<CachedInvoiceRow[]>({
        queryKey: ['sales_returns'],
      });
      for (const [, list] of returnQueries) {
        const hit = searchList(list, invoiceId);
        if (hit != null) return hit;
      }

      return undefined;
    },
  });
};
