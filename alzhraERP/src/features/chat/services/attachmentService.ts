import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { Database } from '../../../core/database.types';

export const attachmentService = {
  /**
   * Upload an attachment (document, image, or audio note) to Supabase Storage and record metadata
   */
  uploadAttachment: async (
    companyId: string,
    messageId: string,
    file: File | Blob,
    fileName?: string
  ): Promise<Database['public']['Tables']['chat_message_attachments']['Row'] | null> => {
    try {
      const originalName =
        fileName || (file instanceof File ? file.name : `voice_${Date.now()}.webm`);
      const cleanFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${companyId}/${messageId}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from('chat_message_attachments')
        .insert({
          message_id: messageId,
          company_id: companyId,
          storage_path: storagePath,
          file_name: originalName,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    } catch (err) {
      logger.error('AttachmentService', 'Error uploading attachment', err);
      throw err;
    }
  },

  /**
   * Get temporary signed URL for private chat attachment
   */
  getAttachmentSignedUrl: async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 3600); // 1 hour validity

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (err) {
      logger.error('AttachmentService', 'Error getting attachment signed URL', err);
      return null;
    }
  },
};
