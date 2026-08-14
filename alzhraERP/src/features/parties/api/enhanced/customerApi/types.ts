/**
 * Enhanced Customer API — raw Supabase row shapes used by the mappers.
 * These mirror the database columns plus the relation joins the queries select,
 * so mappers never need to fall back to `any`.
 */
export interface CustomerActivityRow {
    id: string;
    company_id: string | null;
    customer_id: string | null;
    activity_type: string | null;
    subject: string | null;
    description: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    status: string | null;
    priority: string | null;
    assigned_to: string | null;
    outcome: string | null;
    duration_minutes: number | null;
    created_by: string | null;
    created_at: string | null;
    updated_at: string | null;
    customer_parties?: { name: string } | null;
    assigned_to_profile?: { full_name: string } | null;
    created_by_profile?: { full_name: string } | null;
}

export interface CustomerNoteRow {
    id: string;
    company_id: string | null;
    customer_id: string | null;
    note_type: string | null;
    content: string | null;
    is_important: boolean | null;
    created_by: string | null;
    created_at: string | null;
    created_by_profile?: { full_name: string } | null;
}

export interface CustomerTagRow {
    id: string;
    company_id: string | null;
    name: string;
    color: string | null;
    created_at: string | null;
}

export interface TagAssignmentRow {
    id: string;
    customer_id: string | null;
    tag_id: string | null;
    tag: CustomerTagRow | null;
}

export interface TopCustomerRow {
    id: string;
    name: string;
    total_revenue: number;
    invoice_count: number;
}
