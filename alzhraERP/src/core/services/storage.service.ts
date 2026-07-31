import { supabase } from '../../lib/supabaseClient';

export interface FileAttachment {
    id: string;
    company_id: string;
    entity_type: 'product' | 'invoice' | 'party' | 'expense' | 'journal_entry';
    entity_id: string;
    storage_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    created_by: string;
    created_at: string;
}

export type BucketName = 'product-images' | 'invoices' | 'company-assets';

export const storageService = {
    /**
     * Uploads a file to a specific storage bucket and records it in `file_attachments`.
     */
    async uploadEntityFile({
        bucket,
        file,
        companyId,
        entityType,
        entityId,
        customPath
    }: {
        bucket: BucketName;
        file: File;
        companyId: string;
        entityType: FileAttachment['entity_type'];
        entityId: string;
        customPath?: string;
    }): Promise<{ data: FileAttachment | null; error: Error | null }> {
        try {
            // 1. Generate unique file path
            const fileExt = file.name.split('.').pop();
            const filePath = customPath || `${companyId}/${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            // 2. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 3. Record in `file_attachments`
            const attachmentRecord = {
                company_id: companyId,
                entity_type: entityType,
                entity_id: entityId,
                storage_path: `${bucket}/${filePath}`, // include bucket for easy retrieval
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
            };

            const { data, error: dbError } = await (supabase as any)
                .from('file_attachments')
                .insert([attachmentRecord])
                .select()
                .single();

            if (dbError) throw dbError;

            return { data: data as FileAttachment, error: null };
        } catch (error) {
            console.error('Storage Upload Error:', error);
            return { data: null, error: error as Error };
        }
    },

    /**
     * Gets a public URL for a given storage path (from public buckets only).
     */
    getPublicUrl(bucket: BucketName, filePath: string): string {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    },

    /**
     * Downloads a file directly.
     */
    async downloadFile(bucket: BucketName, filePath: string): Promise<Blob | null> {
        const { data, error } = await supabase.storage.from(bucket).download(filePath);
        if (error) {
            console.error('Download error:', error);
            return null;
        }
        return data;
    },

    /**
     * Fetches metadata for all files attached to a specific entity.
     */
    async getEntityAttachments(companyId: string, entityType: FileAttachment['entity_type'], entityId: string): Promise<FileAttachment[]> {
        const { data, error } = await (supabase as any)
            .from('file_attachments')
            .select('*')
            .eq('company_id', companyId)
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching attachments:', error);
            return [];
        }
        return (data || []) as FileAttachment[];
    },

    /**
     * Deletes a file attachment record and removes the file from storage.
     */
    async deleteAttachment(attachmentId: string): Promise<boolean> {
        try {
            // 1. Get attachment record to find the path
            const { data: record, error: fetchError } = await (supabase as any)
                .from('file_attachments')
                .select('storage_path')
                .eq('id', attachmentId)
                .single();

            if (fetchError || !record) throw new Error('Attachment not found');

            // Extracts bucket name from path created earlier
            const [bucket, ...pathParts] = record.storage_path.split('/');
            const filePath = pathParts.join('/');

            // 2. Delete from storage
            const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([filePath]);

            if (storageError) throw storageError;

            // 3. Delete from database
            const { error: dbError } = await (supabase as any)
                .from('file_attachments')
                .delete()
                .eq('id', attachmentId);

            if (dbError) throw dbError;

            return true;
        } catch (error) {
            console.error('Error deleting attachment:', error);
            return false;
        }
    }
};
