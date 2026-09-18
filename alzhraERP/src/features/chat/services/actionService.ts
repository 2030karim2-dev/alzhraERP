import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { ActionStatus } from '../types';

interface RpcExecuteActionResult {
  success: boolean;
  status: ActionStatus;
  message: string;
}

export const actionService = {
  /**
   * Execute Action Request (e.g. Stock Transfer or Discount Approval)
   */
  executeAction: async (
    messageId: string,
    action: 'approve' | 'reject' | 'cancel',
    notes?: string
  ): Promise<{ success: boolean; status: ActionStatus; message: string }> => {
    try {
      const { data, error } = await (supabase.rpc as any)('rpc_execute_chat_action', {
        p_message_id: messageId,
        p_action: action,
        p_notes: notes || null,
      });

      if (error) throw error;
      return (
        (data as RpcExecuteActionResult) ?? {
          success: false,
          status: 'cancelled',
          message: 'لا يوجد رد من الخادم',
        }
      );
    } catch (err) {
      logger.error('ActionService', 'Error executing chat action', err);
      throw err;
    }
  },
};
