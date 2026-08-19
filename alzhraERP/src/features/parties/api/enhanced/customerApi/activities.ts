/**
 * Enhanced Customer API — activities (CRUD + queries).
 */
import { supabase } from '@/lib/supabaseClient';
import type {
    ActivityStatus,
    ActivityType,
    CustomerActivity,
    CustomerActivityFormData,
    CustomerActivityFilters,
    Priority,
} from '@/features/parties/types/enhanced';
import type { CustomerActivityRow } from './types';

/** Maps a raw joined customer_activities row into the domain type. */
export function mapCustomerActivity(item: CustomerActivityRow): CustomerActivity {
    const activity: CustomerActivity = {
        id: item.id || '',
        companyId: item.company_id || '',
        customerId: item.customer_id || '',
        activityType: item.activity_type as unknown as ActivityType,
        subject: item.subject || '',
        status: (item.status || 'pending') as unknown as ActivityStatus,
        priority: (item.priority || 'medium') as unknown as Priority,
        createdBy: item.created_by || '',
        createdAt: item.created_at || '',
        updatedAt: item.updated_at || '',
    };

    // Assign optional fields only when present (exactOptionalPropertyTypes).
    if (item.description != null) activity.description = item.description;
    if (item.scheduled_at != null) activity.scheduledAt = item.scheduled_at;
    if (item.completed_at != null) activity.completedAt = item.completed_at;
    if (item.assigned_to != null) activity.assignedTo = item.assigned_to;
    if (item.assigned_to_profile?.full_name != null) activity.assignedToName = item.assigned_to_profile.full_name;
    if (item.outcome != null) activity.outcome = item.outcome;
    if (item.duration_minutes != null) activity.durationMinutes = item.duration_minutes;
    if (item.created_by_profile?.full_name != null) activity.createdByName = item.created_by_profile.full_name;

    return activity;
}

export async function getCustomerActivities(customerId: string): Promise<CustomerActivity[]> {
    const { data, error } = await supabase
        .from('customer_activities')
        .select(`
            *,
            assigned_to_profile:profiles!customer_activities_assigned_to_fkey(full_name),
            created_by_profile:profiles!customer_activities_created_by_fkey(full_name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => mapCustomerActivity(item as unknown as CustomerActivityRow));
}

export async function getCompanyActivities(companyId: string, filters?: CustomerActivityFilters): Promise<CustomerActivity[]> {
    let query = supabase
        .from('customer_activities')
        .select(`
            *,
            customer_parties:parties!customer_activities_customer_id_fkey(name),
            assigned_to_profile:profiles!customer_activities_assigned_to_fkey(full_name),
            created_by_profile:profiles!customer_activities_created_by_fkey(full_name)
        `)
        .eq('company_id', companyId);

    if (filters?.activityType) {
        query = query.eq('activity_type', filters.activityType);
    }
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
        query = query.eq('priority', filters.priority);
    }
    if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters?.dateFrom) {
        query = query.gte('scheduled_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
        query = query.lte('scheduled_at', filters.dateTo);
    }

    const { data, error } = await query.order('scheduled_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((item) => mapCustomerActivity(item as unknown as CustomerActivityRow));
}

export async function createActivity(activity: CustomerActivityFormData & { customerId: string; companyId: string }): Promise<CustomerActivity> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    // Guard: created_by must never be null — the DB column is NOT NULL and it
    // preserves user identity for the audit trail.
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('customer_activities')
        .insert({
            company_id: activity.companyId,
            customer_id: activity.customerId,
            activity_type: activity.activityType,
            subject: activity.subject,
            description: activity.description ?? null,
            scheduled_at: activity.scheduledAt ?? null,
            priority: activity.priority ?? 'medium',
            assigned_to: activity.assignedTo ?? null,
            created_by: userId,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;

    // Map through the domain mapper so callers receive camelCase fields —
    // returning the raw row leaks snake_case columns and `undefined` optionals.
    return mapCustomerActivity(data);
}

export async function completeActivity(activityId: string, outcome?: string): Promise<void> {
    const { error } = await supabase
        .from('customer_activities')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            outcome: outcome || null
        })
        .eq('id', activityId);

    if (error) throw error;
}

export async function updateActivity(activityId: string, updates: Partial<CustomerActivityFormData>): Promise<void> {
    const updateData: {
        updated_at: string;
        activity_type?: string;
        subject?: string;
        description?: string | null;
        scheduled_at?: string | null;
        priority?: string;
        assigned_to?: string | null;
    } = {
        updated_at: new Date().toISOString()
    };
    if (updates.activityType !== undefined) updateData.activity_type = updates.activityType;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.description !== undefined) updateData.description = updates.description ?? null;
    if (updates.scheduledAt !== undefined) updateData.scheduled_at = updates.scheduledAt ?? null;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo ?? null;

    const { error } = await supabase
        .from('customer_activities')
        .update(updateData)
        .eq('id', activityId);

    if (error) throw error;
}

export async function deleteActivity(activityId: string): Promise<void> {
    const { error } = await supabase
        .from('customer_activities')
        .delete()
        .eq('id', activityId);

    if (error) throw error;
}
