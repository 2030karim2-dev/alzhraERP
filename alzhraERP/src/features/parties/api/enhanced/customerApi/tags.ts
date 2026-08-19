/**
 * Enhanced Customer API — tags.
 */
import { supabase } from '@/lib/supabaseClient';
import type { CustomerTag, CustomerTagFormData } from '@/features/parties/types/enhanced';
import type { CustomerTagRow, TagAssignmentRow } from './types';

export async function getCompanyTags(companyId: string): Promise<CustomerTag[]> {
    const { data, error } = await supabase
        .from('customer_tags')
        // N+1 fix: aggregate per-tag assignment counts in a single query.
        .select('*, customer_tag_assignments(count)')
        .eq('company_id', companyId)
        .order('name');

    if (error) throw error;

    return (data || []).map((tag) => {
        const row = tag as unknown as CustomerTagRow & {
            customer_tag_assignments?: Array<{ count: number }>;
        };
        return {
            id: row.id,
            companyId: row.company_id || '',
            name: row.name,
            color: row.color || '',
            assignedCount: row.customer_tag_assignments?.[0]?.count ?? 0,
            createdAt: row.created_at || ''
        };
    });
}

export async function createTag(tag: CustomerTagFormData & { companyId: string }): Promise<CustomerTag> {
    const { data, error } = await supabase
        .from('customer_tags')
        .insert({
            company_id: tag.companyId,
            name: tag.name,
            color: tag.color
        })
        .select()
        .single();

    if (error) throw error;
    return {
        id: data.id,
        companyId: data.company_id || '',
        name: data.name,
        color: data.color || ''
    };
}

export async function updateTag(tagId: string, updates: Partial<CustomerTagFormData>): Promise<void> {
    const updateData: { name?: string; color?: string } = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;

    const { error } = await supabase
        .from('customer_tags')
        .update(updateData)
        .eq('id', tagId);

    if (error) throw error;
}

export async function deleteTag(tagId: string): Promise<void> {
    const { error } = await supabase
        .from('customer_tags')
        .delete()
        .eq('id', tagId);

    if (!error) return;

    // Foreign-key violation: the tag is still referenced from
    // customer_tag_assignments → surface a clear message instead of a raw error.
    if (error.code === '23503') {
        throw new Error('لا يمكن حذف هذه الوسم لأنها مرتبطة بعملاء حالياً. قم بإزالة الارتباط أولاً.');
    }
    throw error;
}

export async function assignTag(customerId: string, tagId: string): Promise<void> {
    const { error } = await supabase
        .from('customer_tag_assignments')
        .insert({
            customer_id: customerId,
            tag_id: tagId
        });

    // Ignore "duplicate key" violations (unique constraint) — check the
    // structured Postgres error code (23505) instead of brittle message text.
    if (error && error.code !== '23505') throw error;
}

export async function removeTag(customerId: string, tagId: string): Promise<void> {
    const { error } = await supabase
        .from('customer_tag_assignments')
        .delete()
        .eq('customer_id', customerId)
        .eq('tag_id', tagId);

    if (error) throw error;
}

export async function getCustomerTags(customerId: string): Promise<CustomerTag[]> {
    const { data, error } = await supabase
        .from('customer_tag_assignments')
        .select(`
        tag:tag_id(*)
      `)
        .eq('customer_id', customerId);

    if (error) throw error;

    return (data || []).map((item) => {
        const row = item as unknown as TagAssignmentRow;
        const tag = row.tag;
        return {
            id: tag?.id || '',
            companyId: tag?.company_id || '',
            name: tag?.name || '',
            color: tag?.color || ''
        };
    });
}
