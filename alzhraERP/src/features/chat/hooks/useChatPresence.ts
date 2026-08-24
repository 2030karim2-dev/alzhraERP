import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';

export const useChatPresence = (activeChannelId?: string | null) => {
  const { user } = useAuthStore();
  const { setUserPresence, setTyping } = useChatStore();
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const companyId = user?.company_id;
  const userId = user?.id;
  const userName = user?.full_name || user?.email || 'موظف';
  const branchId = user?.branch_id;
  const branchName = user?.branch_name;

  useEffect(() => {
    if (!companyId || !userId) return;

    const channelName = `chat-presence-${companyId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        for (const id in state) {
          const presences = state[id] as any[];
          if (presences && presences.length > 0) {
            const p = presences[0];
            setUserPresence({
              user_id: p.user_id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              status: p.status || 'online',
              branch_id: p.branch_id,
              branch_name: p.branch_name,
              last_seen_at: p.last_seen_at || new Date().toISOString(),
              typing_in_channel_id: p.typing_in_channel_id || null,
            });
          }
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if (newPresences) {
          for (const p of newPresences as any[]) {
            setUserPresence({
              user_id: p.user_id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              status: 'online',
              branch_id: p.branch_id,
              branch_name: p.branch_name,
              last_seen_at: new Date().toISOString(),
            });
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (leftPresences) {
          for (const p of leftPresences as any[]) {
            setUserPresence({
              user_id: p.user_id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              status: 'offline',
              branch_id: p.branch_id,
              branch_name: p.branch_name,
              last_seen_at: new Date().toISOString(),
            });
          }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload && payload.channel_id && payload.user_id !== userId) {
          setTyping(payload.channel_id, payload.user_name, payload.is_typing);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            full_name: userName,
            avatar_url: user?.avatar_url || null,
            status: 'online',
            branch_id: branchId || null,
            branch_name: branchName || null,
            last_seen_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [companyId, userId, userName, branchId, branchName, setUserPresence, setTyping, user?.avatar_url]);

  // Broadcast typing state
  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (!presenceChannelRef.current || !activeChannelId || !userId) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      presenceChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          channel_id: activeChannelId,
          user_id: userId,
          user_name: userName,
          is_typing: isTyping,
        },
      });

      if (isTyping) {
        // Auto-stop typing after 3 seconds of silence
        typingTimeoutRef.current = setTimeout(() => {
          if (presenceChannelRef.current && activeChannelId) {
            presenceChannelRef.current.send({
              type: 'broadcast',
              event: 'typing',
              payload: {
                channel_id: activeChannelId,
                user_id: userId,
                user_name: userName,
                is_typing: false,
              },
            });
          }
        }, 3000);
      }
    },
    [activeChannelId, userId, userName]
  );

  return { broadcastTyping };
};
