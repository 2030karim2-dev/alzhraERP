/**
 * Enhanced Customer API — statistics & dashboard queries.
 */
import { supabase } from '@/lib/supabaseClient';
import type {
    CustomerActivity,
    CustomerStats,
    TopCustomer,
} from '@/features/parties/types/enhanced';
import type { CustomerActivityRow, TopCustomerRow } from './types';
import { mapCustomerActivity } from './activities';

export async function getCustomerStats(companyId: string): Promise<CustomerStats> {
    const { data, error } = await supabase
        .rpc('get_customer_stats', { p_company_id: companyId });

    if (error) throw error;
    return data as unknown as CustomerStats;
}

export async function getTopCustomers(companyId: string, limit: number = 10): Promise<TopCustomer[]> {
    const { data, error } = await supabase
        .rpc('get_top_customers_by_revenue', {
            p_company_id: companyId,
            p_limit: limit
        });

    if (error) throw error;
    return (data || []).map((item) => {
        const row = item as unknown as TopCustomerRow;
        return {
            id: row.id,
            name: row.name,
            totalRevenue: row.total_revenue,
            invoiceCount: row.invoice_count
        };
    });
}

export async function getUpcomingActivities(companyId: string, days: number = 7): Promise<CustomerActivity[]> {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + days);

    const { data, error } = await supabase
        .from('customer_activities')
        .select(`
            *,
            customer_parties:parties!customer_activities_customer_id_fkey(name),
            assigned_to_profile:profiles!customer_activities_assigned_to_fkey(full_name)
        `)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .gte('scheduled_at', fromDate.toISOString())
        .lte('scheduled_at', toDate.toISOString())
        .order('scheduled_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((item) => mapCustomerActivity(item as unknown as CustomerActivityRow));
}

export async function getOverdueActivities(companyId: string): Promise<CustomerActivity[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('customer_activities')
        .select(`
            *,
            customer_parties:parties!customer_activities_customer_id_fkey(name),
            assigned_to_profile:profiles!customer_activities_assigned_to_fkey(full_name)
        `)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .lt('scheduled_at', now)
        .order('scheduled_at', { ascending: true });

    if (error) throw error;

    // Mark them as overdue
    if (data && data.length > 0) {
        await supabase
            .from('customer_activities')
            .update({ status: 'overdue' })
            .eq('company_id', companyId)
            .eq('status', 'pending')
            .lt('scheduled_at', now);
    }

    return (data || []).map((item) => {
        const activity = mapCustomerActivity(item as unknown as CustomerActivityRow);
        activity.status = 'overdue';
        return activity;
    });
}
