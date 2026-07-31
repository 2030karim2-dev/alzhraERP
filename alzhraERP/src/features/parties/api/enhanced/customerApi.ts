/**
 * Enhanced Customer API
 * Handles customer activities, notes, tags, and statistics
 */

import { supabase } from '@/lib/supabaseClient';
import type {
    CustomerActivity,
    CustomerNote,
    CustomerTag,
    CustomerStats,
    TopCustomer,
    CustomerActivityFormData,
    CustomerNoteFormData,
    CustomerTagFormData,
    CustomerActivityFilters
} from '@/features/parties/types/enhanced';

export const customerApi = {
    // ============================================================
    // Customer Activities
    // ============================================================

    _mapCustomerActivity(item: any): CustomerActivity {
        return {
            id: item.id,
            companyId: item.company_id || '',
            customerId: item.customer_id || '',
            customerName: item.customer_parties?.name,
            activityType: item.activity_type as any,
            subject: item.subject,
            description: item.description === null ? undefined : item.description,
            scheduledAt: item.scheduled_at === null ? undefined : item.scheduled_at,
            completedAt: item.completed_at === null ? undefined : item.completed_at,
            status: (item.status || 'pending') as any,
            priority: (item.priority || 'medium') as any,
            assignedTo: item.assigned_to === null ? undefined : item.assigned_to,
            assignedToName: (item.assigned_to_profile?.full_name) === null ? undefined : item.assigned_to_profile?.full_name,
            outcome: item.outcome === null ? undefined : item.outcome,
            durationMinutes: item.duration_minutes === null ? undefined : item.duration_minutes,
            createdBy: item.created_by || '',
            createdByName: (item.created_by_profile?.full_name) === null ? undefined : item.created_by_profile?.full_name,
            createdAt: item.created_at || '',
            updatedAt: item.updated_at || ''
        } as any;
    },

    async getCustomerActivities(customerId: string): Promise<CustomerActivity[]> {
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

        return (data || []).map((item: any) => this._mapCustomerActivity(item));
    },

    async getCompanyActivities(companyId: string, filters?: CustomerActivityFilters): Promise<CustomerActivity[]> {
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

        return (data || []).map((item: any) => this._mapCustomerActivity(item));
    },

    async createActivity(activity: CustomerActivityFormData & { customerId: string; companyId: string }): Promise<CustomerActivity> {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;

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
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data as any as CustomerActivity;
    },


    async completeActivity(activityId: string, outcome?: string): Promise<void> {
        const { error } = await supabase
            .from('customer_activities')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                outcome: outcome || null
            })
            .eq('id', activityId);

        if (error) throw error;
    },


    async updateActivity(activityId: string, updates: Partial<CustomerActivityFormData>): Promise<void> {
        const updateData: any = {
            updated_at: new Date().toISOString()
        };
        if (updates.activityType !== undefined) updateData.activity_type = updates.activityType;
        if (updates.subject !== undefined) updateData.subject = updates.subject;
        if (updates.description !== undefined) updateData.description = updates.description ?? null;
        if (updates.scheduledAt !== undefined) updateData.scheduled_at = updates.scheduledAt ?? null;
        if (updates.priority !== undefined) updateData.priority = updates.priority ?? 'medium';
        if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo ?? null;

        const { error } = await supabase
            .from('customer_activities')
            .update(updateData as any)
            .eq('id', activityId);

        if (error) throw error;
    },

    async deleteActivity(activityId: string): Promise<void> {
        const { error } = await supabase
            .from('customer_activities')
            .delete()
            .eq('id', activityId);

        if (error) throw error;
    },

    // ============================================================
    // Customer Notes
    // ============================================================

    async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
        const { data, error } = await supabase
            .from('customer_notes')
            .select(`
                *,
                created_by_profile:profiles!customer_notes_created_by_fkey(full_name)
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            companyId: item.company_id || '',
            customerId: item.customer_id || '',
            noteType: item.note_type as any,
            content: item.content,
            isImportant: item.is_important || false,
            createdBy: item.created_by || '',
            createdByName: item.created_by_profile?.full_name || undefined,
            createdAt: item.created_at || ''
        } as any));
    },

    async addNote(note: CustomerNoteFormData & { customerId: string; companyId: string }): Promise<CustomerNote> {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id ?? null;

        const { data, error } = await supabase
            .from('customer_notes')
            .insert({
                company_id: note.companyId,
                customer_id: note.customerId,
                note_type: note.noteType,
                content: note.content,
                is_important: note.isImportant || false,
                created_by: userId
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data as any as CustomerNote;
    },

    async deleteNote(noteId: string): Promise<void> {
        const { error } = await supabase
            .from('customer_notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;
    },

    // ============================================================
    // Customer Tags
    // ============================================================

    async getCompanyTags(companyId: string): Promise<CustomerTag[]> {
        const { data, error } = await supabase
            .from('customer_tags')
            .select('*')
            .eq('company_id', companyId)
            .order('name');

        if (error) throw error;

        // Get count for each tag
        const tagsWithCount = await Promise.all(
            (data || []).map(async (tag: any) => {
                const { count } = await supabase
                    .from('customer_tag_assignments')
                    .select('*', { count: 'exact', head: true })
                    .eq('tag_id', tag.id);

                return {
                    id: tag.id,
                    companyId: tag.company_id || '',
                    name: tag.name,
                    color: tag.color || '',
                    assignedCount: count || 0,
                    createdAt: tag.created_at || ''
                };
            })
        );

        return tagsWithCount;
    },

    async createTag(tag: CustomerTagFormData & { companyId: string }): Promise<CustomerTag> {
        const { data, error } = await supabase
            .from('customer_tags')
            .insert({
                company_id: tag.companyId,
                name: tag.name,
                color: tag.color
            } as any)
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            companyId: data.company_id || '',
            name: data.name,
            color: data.color || ''
        };
    },

    async updateTag(tagId: string, updates: Partial<CustomerTagFormData>): Promise<void> {
        const { error } = await supabase
            .from('customer_tags')
            .update({
                name: updates.name,
                color: updates.color
            } as any)
            .eq('id', tagId);

        if (error) throw error;
    },

    async deleteTag(tagId: string): Promise<void> {
        const { error } = await supabase
            .from('customer_tags')
            .delete()
            .eq('id', tagId);

        if (error) throw error;
    },

    async assignTag(customerId: string, tagId: string): Promise<void> {
        const { error } = await supabase
            .from('customer_tag_assignments')
            .insert({
                customer_id: customerId,
                tag_id: tagId
            });

        if (error && !error.message.includes('duplicate')) throw error;
    },

    async removeTag(customerId: string, tagId: string): Promise<void> {
        const { error } = await supabase
            .from('customer_tag_assignments')
            .delete()
            .eq('customer_id', customerId)
            .eq('tag_id', tagId);

        if (error) throw error;
    },

    async getCustomerTags(customerId: string): Promise<CustomerTag[]> {
        const { data, error } = await supabase
            .from('customer_tag_assignments')
            .select(`
        tag:tag_id(*)
      `)
            .eq('customer_id', customerId);

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.tag.id,
            companyId: item.tag.company_id || '',
            name: item.tag.name,
            color: item.tag.color || ''
        }));
    },

    // ============================================================
    // Statistics
    // ============================================================

    async getCustomerStats(companyId: string): Promise<CustomerStats> {
        const { data, error } = await supabase
            .rpc('get_customer_stats', { p_company_id: companyId });

        if (error) throw error;
        return data as any as CustomerStats;
    },

    async getTopCustomers(companyId: string, limit: number = 10): Promise<TopCustomer[]> {
        const { data, error } = await supabase
            .rpc('get_top_customers_by_revenue', {
                p_company_id: companyId,
                p_limit: limit
            });

        if (error) throw error;
        return (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            totalRevenue: item.total_revenue,
            invoiceCount: item.invoice_count
        }));
    },

    // ============================================================
    // Dashboard/Overview
    // ============================================================

    async getUpcomingActivities(companyId: string, days: number = 7): Promise<CustomerActivity[]> {
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

        return (data || []).map((item: any) => this._mapCustomerActivity(item));
    },

    async getOverdueActivities(companyId: string): Promise<CustomerActivity[]> {
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

        return (data || []).map((item: any) => {
            const activity = this._mapCustomerActivity(item);
            activity.status = 'overdue';
            return activity;
        });
    }
};
