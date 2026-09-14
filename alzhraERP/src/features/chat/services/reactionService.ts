import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { ChatReaction } from '../types';

export const reactionService = {
  /**
   * Add or toggle an emoji reaction on a message
   */
  toggleReaction: async (
    messageId: string,
    emoji: string,
    currentReactions: ChatReaction[],
    userId: string
  ): Promise<void> => {
    try {
      const existing = currentReactions.find(r => r.user_id === userId && r.emoji === emoji);
      if (existing) {
        await supabase.from('chat_message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('chat_message_reactions').insert({
          message_id: messageId,
          emoji,
        });
      }
    } catch (err) {
      logger.error('ReactionService', 'Error toggling reaction', err);
      throw err;
    }
  },
};
