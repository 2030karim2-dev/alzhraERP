// ============================================
// Sales Seed Hook
// Hook for seeding initial sales data
// ============================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useFeedbackStore } from '../../feedback/store';

interface SalesSeedData {
    companyId: string;
    invoiceCount?: number;
}

export const useSalesSeed = () => {
    const queryClient = useQueryClient();
    const { showToast } = useFeedbackStore();

    return useMutation({
        mutationFn: async (data: SalesSeedData) => {
            const { companyId, invoiceCount = 10 } = data;

            // Generate sample invoices
            const invoices = [];
            const now = new Date();

            for (let i = 0; i < invoiceCount; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - Math.floor(Math.random() * 30));

                invoices.push({
                    company_id: companyId,
                    party_id: null,
                    invoice_number: `INV-${String(i + 1).padStart(5, '0')}`,
                    type: Math.random() > 0.1 ? 'sale' : 'return_sale',
                    status: ['draft', 'pending', 'confirmed', 'paid'][Math.floor(Math.random() * 4)],
                    subtotal: Math.floor(Math.random() * 10000) + 1000,
                    tax_amount: Math.floor(Math.random() * 1500) + 150,
                    total_amount: 0, // Will be calculated
                    payment_method: ['cash', 'card', 'bank_transfer'][Math.floor(Math.random() * 3)],
                    issue_date: date.toISOString().split('T')[0],
                    created_at: date.toISOString(),
                });
            }

            // Calculate totals
            invoices.forEach(inv => {
                inv.total_amount = inv.subtotal + inv.tax_amount;
            });

            const { data: inserted, error } = await supabase
                .from('invoices')
                .upsert(invoices, { onConflict: 'invoice_number' })
                .select();

            if (error) throw error;
            return inserted;
        },
        onSuccess: () => {
            showToast('تم إضافة بيانات المبيعات بنجاح', 'success');
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
        },
        onError: (error: Error) => {
            showToast(error.message || 'فشل في إضافة البيانات', 'error');
        },
    });
};

export default useSalesSeed;
