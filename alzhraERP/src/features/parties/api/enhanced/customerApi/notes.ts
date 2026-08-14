/**
 * Enhanced Customer API — notes.
 */
import { supabase } from '@/lib/supabaseClient';
import type {
    CustomerNote,
    CustomerNoteFormData,
    NoteType,
} from '@/features/parties/types/enhanced';
import type { CustomerNoteRow } from './types';

export async function getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    const { data, error } = await supabase
        .from('customer_notes')
        .select(`
            *,
            created_by_profile:profiles!customer_notes_created_by_fkey(full_name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item) => {
        const row = item as unknown as CustomerNoteRow;
        const createdByName = row.created_by_profile?.full_name;
        return {
            id: row.id,
            companyId: row.company_id || '',
            customerId: row.customer_id || '',
            noteType: row.note_type as unknown as NoteType,
            content: row.content || '',
            isImportant: row.is_important || false,
            createdBy: row.created_by || '',
            createdAt: row.created_at || '',
            ...(createdByName ? { createdByName } : {}),
        } as CustomerNote;
    });
}

export async function addNote(note: CustomerNoteFormData & { customerId: string; companyId: string }): Promise<CustomerNote> {
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
        })
        .select()
        .single();

    if (error) throw error;
    return data as unknown as CustomerNote;
}

export async function deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId);

    if (error) throw error;
}
