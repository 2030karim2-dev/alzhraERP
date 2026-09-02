import { logger } from '../../core/utils/logger';
// ============================================
// Messaging API - Supabase Integration
// ============================================

import { supabase } from '../../lib/supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';

export interface MessagingConfig {
  id?: string;
  company_id: string;
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  whatsapp_enabled: boolean;
  whatsapp_api_url: string;
  whatsapp_api_key: string;
  whatsapp_phone: string;
  notify_on_sale: boolean;
  notify_on_purchase: boolean;
  notify_on_bond: boolean;
  notify_on_expense: boolean;
  notify_on_stock_transfer: boolean;
  notify_on_low_stock: boolean;
}

export interface NotificationLogEntry {
  id: string;
  company_id: string;
  channel: 'telegram' | 'whatsapp';
  event_type: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  reference_id?: string;
  created_at: string;
}

export const DEFAULT_MESSAGING_CONFIG: Omit<MessagingConfig, 'company_id'> = {
  telegram_enabled: false,
  telegram_bot_token: '',
  telegram_chat_id: '',
  whatsapp_enabled: false,
  whatsapp_api_url: '',
  whatsapp_api_key: '',
  whatsapp_phone: '',
  notify_on_sale: true,
  notify_on_purchase: true,
  notify_on_bond: true,
  notify_on_expense: true,
  notify_on_stock_transfer: true,
  notify_on_low_stock: true,
};

// ── Secret handling ───────────────────────────────────────────────────────────
// Raw API keys (WhatsApp token / Telegram bot token) must NEVER live in React
// state or be written back over the stored value. On fetch they are replaced
// with this sentinel; on save a sentinel value is omitted from the payload.
export const MASKED_SECRET = '••••••••••';

export const SECRET_FIELDS = ['whatsapp_api_key', 'telegram_bot_token'] as const;

type MessagingConfigRow = MessagingConfig & Record<string, unknown>;

const redactSecrets = (row: MessagingConfig): MessagingConfig => {
  const redacted = { ...row } as MessagingConfigRow;
  for (const field of SECRET_FIELDS) {
    redacted[field] = redacted[field] ? MASKED_SECRET : '';
  }
  return redacted;
};

export const messagingApi = {
  /**
   * Get messaging config for a company
   */
  getConfig: async (companyId: string): Promise<MessagingConfig | null> => {
    const { data, error } = await supabase
      .from('messaging_config')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      logger.error('messagingApi', '[MessagingAPI] Error fetching config:', error);
    }
    if (!data) return null;
    // 🔒 Redact secrets so raw keys never enter app state / logs.
    return redactSecrets(data as unknown as MessagingConfig);
  },

  /**
   * Save/update messaging config.
   * Secret fields carrying the MASKED_SECRET sentinel are OMITTED from the
   * upsert so the stored key is never overwritten with the mask.
   */
  saveConfig: async (config: MessagingConfig): Promise<{ error: PostgrestError | null }> => {
    const payload = { ...config, updated_at: new Date().toISOString() } as MessagingConfigRow;

    for (const field of SECRET_FIELDS) {
      if (payload[field] === MASKED_SECRET) {
        delete payload[field];
      }
    }

    const { error } = await supabase
      .from('messaging_config')
      .upsert(payload as any, { onConflict: 'company_id' });

    if (error) {
      logger.error('messagingApi', '[MessagingAPI] Error saving config:', error);
    }
    return { error };
  },

  /**
   * Send notification via Edge Function
   */
  sendNotification: async (
    companyId: string,
    eventType: string,
    message: string,
    referenceId?: string
  ): Promise<{
    success: boolean;
    results?: Array<{ channel?: string; success?: boolean; error?: string }>;
  }> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            event_type: eventType,
            message,
            reference_id: referenceId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        logger.error('messagingApi', '[MessagingAPI] Edge function error:', result);
        return { success: false };
      }

      return { success: true, results: result.results };
    } catch (error) {
      logger.error('messagingApi', '[MessagingAPI] Send notification error:', error);
      return { success: false };
    }
  },

  /**
   * Get notification log
   */
  getLog: async (companyId: string, limit = 50): Promise<NotificationLogEntry[]> => {
    const { data, error } = await supabase
      .from('notification_log')
      .select(
        'id, company_id, channel, event_type, message, status, error_message, reference_id, created_at'
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('messagingApi', '[MessagingAPI] Error fetching log:', error);
      return [];
    }
    return (data || []) as NotificationLogEntry[];
  },
};
