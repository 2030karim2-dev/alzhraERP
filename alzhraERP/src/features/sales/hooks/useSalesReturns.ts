// ============================================
// Sales Returns Hook
// Custom hooks for managing sales returns data
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { invalidateByPreset } from '../../../lib/invalidation';
import type { Invoice, Party, InvoiceItem } from '../../../core/types/supabase-helpers';
import type { InvoiceStatus } from '../types';

interface SalesReturn {
    id: string;
    invoice_number: string;
    issue_date: string;
    total_amount: number;
    status: InvoiceStatus;
    notes?: string | null;
    currency_code?: string | null;
    exchange_rate?: number | null;
    reference_invoice_id?: string | null;
    party?: {
        id: string;
        name: string;
    } | null;
    invoice_items?: {
        id: string;
        product_id: string;
        description: string;
        quantity: number;
        unit_price: number;
        total: number;
    }[];
    created_at: string;
}

type SalesReturnQueryResult = Pick<Invoice, 'id' | 'invoice_number' | 'issue_date' | 'total_amount' | 'status' | 'notes' | 'created_at' | 'reference_invoice_id' | 'currency_code' | 'exchange_rate'> & {
    party: Pick<Party, 'id' | 'name'> | null;
    invoice_items: Pick<InvoiceItem, 'id' | 'product_id' | 'description' | 'quantity' | 'unit_price' | 'total'>[];
};

/*
interface SalesReturnsStats {
    returnCount: number;
    totalReturns: number;
    avgReturn: number;
    pendingCount: number;
}
*/

// Fetch all sales returns with optional filters
export const useSalesReturns = (filters?: {
    searchTerm?: string;
    status?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}) => {
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ['sales-returns', filters],
        queryFn: async () => {
            if (!user?.company_id) return [];

            let query = supabase
                .from('invoices')
                .select(`
          id,
          invoice_number,
          issue_date,
          total_amount,
          status,
          notes,
          currency_code,
          exchange_rate,
          party:party_id(id, name),
          invoice_items:invoice_items(
            id,
            product_id,
            description,
            quantity,
            unit_price,
            total
          ),
          reference_invoice_id,
          created_at
        `)
                .eq('company_id', user.company_id)
                .eq('type', 'return_sale')
                .is('deleted_at', null);

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            if (filters?.startDate) {
                query = query.gte('issue_date', filters.startDate);
            }

            if (filters?.endDate) {
                query = query.lte('issue_date', filters.endDate);
            }

            const { data, error } = await query
                .order('issue_date', { ascending: false });

            if (error) throw error;
            const typedData = data as unknown as SalesReturnQueryResult[];

            // Client-side search filtering
            let returns = typedData || [];

            if (filters?.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                returns = returns.filter((r: SalesReturnQueryResult) =>
                    (r.invoice_number || '').toLowerCase().includes(term) ||
                    (r.party?.name || '').toLowerCase().includes(term) ||
                    (r.notes || '').toLowerCase().includes(term)
                );
            }

            return returns as SalesReturn[];
        },
        enabled: !!user?.company_id,
    });
};

// Fetch sales returns statistics
export const useSalesReturnsStats = () => {
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ['sales-returns-stats'],
        queryFn: async () => {
            if (!user?.company_id) {
                return { returnCount: 0, totalReturns: 0, avgReturn: 0, pendingCount: 0 };
            }

            const { data, error } = await supabase
                .from('invoices')
                .select('id, total_amount, status')
                .eq('company_id', user.company_id)
                .eq('type', 'return_sale')
                .is('deleted_at', null);

            if (error) throw error;
            const typedData = data as unknown as Pick<Invoice, 'id' | 'total_amount' | 'status'>[];

            const returns = typedData || [];
            const returnCount = returns.length;
            const totalReturns = returns.reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0);
            const avgReturn = returnCount > 0 ? totalReturns / returnCount : 0;
            const pendingCount = returns.filter((r: any) => r.status === 'draft' || r.status === 'posted').length;

            return {
                returnCount,
                totalReturns,
                avgReturn,
                pendingCount
            };
        },
        enabled: !!user?.company_id,
    });
};

// Create a new sales return
export const useCreateSalesReturn = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    return useMutation({
        mutationFn: async (data: {
            invoiceId: string;
            partyId: string;
            paymentMethod?: string;
            items: any[];
            returnReason?: string;
            status?: string;
            notes?: string;
            issueDate?: string;
            currency?: string;
            exchangeRate?: number;
        }) => {
            if (!user?.company_id || !user?.id) {
                throw new Error('Missing authentication context');
            }

            const { data: result, error } = await supabase.rpc('process_sales_return', {
                p_invoice_id: data.invoiceId,
                p_party_id: data.partyId,
                p_payment_method: data.paymentMethod || 'cash',
                p_items: data.items,
                p_return_reason: data.returnReason || '',
                p_status: data.status || 'posted',
                p_notes: data.notes || '',
                p_issue_date: data.issueDate || new Date().toISOString().split('T')[0],
                p_currency_code: data.currency || 'SAR',
                p_exchange_rate: data.exchangeRate || 1,
                p_company_id: user.company_id,
                p_user_id: user.id
            });

            if (error) throw error;
            return result as { invoice_number: string };
        },
        onSuccess: (invoice) => {
            showToast(`تم إنشاء مرتجع المبيعات #${invoice?.invoice_number || 'الجديد'} بنجاح`, 'success');
            invalidateByPreset(queryClient, 'saleReturn');
        },
        onError: (error: Error) => {
            showToast(error.message || 'فشل في إنشاء مرتجع المبيعات', 'error');
        }
    });
};

// Fetch sales invoices for return selection
export const useSalesInvoicesForReturn = (customerId?: string | null) => {
    const { user } = useAuthStore();

    return useQuery({
        queryKey: ['sales-invoices-for-return', customerId],
        queryFn: async () => {
            if (!user?.company_id) return [];

            let query = supabase
                .from('invoices')
                .select(`
          id,
          invoice_number,
          issue_date,
          total_amount,
          currency_code,
          exchange_rate,
          payment_method,
          created_by,
          party:party_id(id, name),
          invoice_items(id, product_id, description, quantity, unit_price, total)
        `)
                .eq('company_id', user.company_id)
                .eq('type', 'sale')
                .eq('status', 'posted')
                .is('deleted_at', null);

            if (customerId) {
                query = query.eq('party_id', customerId);
            }

            const { data, error } = await query
                .order('issue_date', { ascending: false })
                .limit(100);

            if (error) throw error;
            const typedData = data as unknown as SalesReturnQueryResult[];

            return typedData || [];
        },
        enabled: !!user?.company_id,
    });
};
