// ============================================
// useStockAudit — إدارة جلسات الجرد والتسوية
// ============================================
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../service';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import { syncStore } from '../../../core/lib/sync-store';

/** جلب قائمة جلسات الجرد */
export const useAuditSessions = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['audit_sessions', user?.company_id],
    queryFn: () =>
      user?.company_id
        ? inventoryService.getAuditSessions(user.company_id)
        : Promise.resolve<Awaited<ReturnType<typeof inventoryService.getAuditSessions>>>([]),
    enabled: !!user?.company_id,
  });
};

/** جلب تفاصيل جلسة جرد مع Realtime subscription */
export const useAuditSession = (sessionId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['audit_session', sessionId],
    queryFn: () =>
      sessionId
        ? inventoryService.getAuditSessionDetails(sessionId)
        : Promise.reject('No session ID'),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionId) return;

    const channelKey = `audit_session_${sessionId}`;
    type AuditChannel = ReturnType<typeof supabase.channel>;
    interface AuditChannelRegistry {
      __ALZ_AUDIT_CHANNELS__?: Map<string, AuditChannel>;
    }
    const registryRef = window as unknown as AuditChannelRegistry;
    let registry = registryRef.__ALZ_AUDIT_CHANNELS__;
    if (!registry) {
      registry = new Map<string, AuditChannel>();
      registryRef.__ALZ_AUDIT_CHANNELS__ = registry;
    }

    // Reuse existing channel if already subscribed (prevents race condition)
    if (!registry.has(channelKey)) {
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'audit_items',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload: Record<string, unknown>) => {
            logger.debug('Audit item changed:', JSON.stringify(payload));
            void queryClient.invalidateQueries({ queryKey: ['audit_session', sessionId] });
          }
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Audit', `Realtime channel [${channelKey}] subscribed`);
          }
        });

      registry.set(channelKey, channel);
    }

    return () => {
      /* no-op: keep channel alive for stability */
    };
  }, [sessionId, queryClient]);

  return query;
};

/** mutations خاصة بجلسات الجرد والتسوية السريعة */
export const useInventoryMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const transfer = useMutation({
    mutationFn: (
      data: Omit<Parameters<typeof inventoryService.createTransfer>[0], 'company_id' | 'user_id'>
    ) => {
      if (!user?.company_id || !user.id) throw new Error('Auth error');
      return inventoryService.createTransfer({
        ...data,
        company_id: user.company_id,
        user_id: user.id,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      showToast('تمت المناقلة بنجاح', 'success');
    },
    onError: (err, variables) => {
      if (
        !navigator.onLine ||
        err.message?.includes('Failed to fetch') ||
        (err as Error & { status?: number }).status === 0
      ) {
        void syncStore.enqueue({
          mutationKey: ['inventory', 'transfer'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id },
        });
        showToast('تمت المناقلة محلياً (وضع عدم الاتصال).', 'info');
        return;
      }
      showToast('فشل المناقلة: ' + err.message, 'error');
    },
  });

  const audit = useMutation({
    mutationFn: (data: { warehouse_id: string; title: string }) => {
      if (!user?.company_id || !user.id) throw new Error('Auth error');
      return inventoryService.startAudit(data, user.company_id, user.id);
    },
    onSuccess: async newSession => {
      await queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
      showToast('تم بدء جلسة الجرد', 'success');
      return newSession;
    },
    onError: (err, variables) => {
      if (
        !navigator.onLine ||
        err.message?.includes('Failed to fetch') ||
        (err as Error & { status?: number }).status === 0
      ) {
        void syncStore.enqueue({
          mutationKey: ['inventory', 'start_audit'],
          variables: { ...variables, company_id: user?.company_id, user_id: user?.id },
        });
        showToast('بدء الجرد محلياً (وضع عدم الاتصال).', 'info');
        return;
      }
      showToast('فشل بدء الجرد: ' + err.message, 'error');
    },
  });

  const finalize = useMutation({
    mutationFn: ({
      sessionId,
      items,
    }: {
      sessionId: string;
      items: Parameters<typeof inventoryService.finalizeAudit>[1];
    }) => {
      if (!user?.company_id || !user.id) throw new Error('Auth error');
      return inventoryService.finalizeAudit(sessionId, items, user.company_id, user.id);
    },
    onSuccess: async (_, { sessionId }) => {
      await queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['audit_session', sessionId] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('تم إغلاق الجرد وترحيل الفروقات', 'success');
    },
    onError: err => {
      showToast('فشل إنهاء الجرد: ' + err.message, 'error');
      logger.error('useStockAudit', 'Finalize Audit Error:', err);
    },
  });

  const saveProgress = useMutation({
    mutationFn: (items: Parameters<typeof inventoryService.saveAuditProgress>[0]) =>
      inventoryService.saveAuditProgress(items),
    onSuccess: () => {
      showToast('تم حفظ التقدم', 'info', { hideAfter: 2000 });
    },
    onError: (err, items) => {
      if (
        !navigator.onLine ||
        err.message?.includes('Failed to fetch') ||
        (err as Error & { status?: number }).status === 0
      ) {
        void syncStore.enqueue({
          mutationKey: ['inventory', 'save_audit_progress'],
          variables: { items },
        });
        return;
      }
    },
  });

  const quickAdjust = useMutation({
    mutationFn: (items: { product_id: string; warehouse_id: string; quantity: number }[]) => {
      if (!user?.company_id || !user.id) throw new Error('Auth error');
      return inventoryService.quickAdjustStock(user.company_id, items, user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
      showToast('تم إضافة التسويات السريعة بنجاح', 'success');
    },
    onError: err => {
      showToast('فشلت التسوية السريعة: ' + err.message, 'error');
    },
  });

  const addItem = useMutation({
    mutationFn: ({
      sessionId,
      productId,
      expectedQuantity,
    }: {
      sessionId: string;
      productId: string;
      expectedQuantity: number;
    }) => {
      return inventoryService.addAuditItem(
        sessionId,
        productId,
        expectedQuantity,
        user?.company_id || '',
        user?.id || ''
      );
    },
    onSuccess: async (_, { sessionId }) => {
      await queryClient.invalidateQueries({ queryKey: ['audit_session', sessionId] });
    },
    onError: err => {
      showToast('فشل إضافة الصنف: ' + err.message, 'error');
    },
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => {
      return inventoryService.deleteAuditItem(itemId);
    },
    onSuccess: async () => {
      // Invalidate specific session caches (not all sessions)
      await queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['audit_session'] });
      showToast('تم إزالة الصنف من الجلسة', 'info');
    },
    onError: err => {
      showToast('فشل إزالة الصنف: ' + err.message, 'error');
    },
  });

  const deleteSession = useMutation({
    mutationFn: (sessionId: string) => inventoryService.deleteAuditSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
      showToast('تم حذف جلسة الجرد', 'success');
    },
    onError: err => {
      showToast('فشل حذف الجلسة: ' + err.message, 'error');
    },
  });

  return {
    createTransfer: transfer.mutate,
    isTransferring: transfer.isPending,
    startAudit: audit.mutate,
    isStartingAudit: audit.isPending,
    finalizeAudit: finalize.mutate,
    isFinalizing: finalize.isPending,
    saveAuditProgress: saveProgress.mutate,
    isSavingProgress: saveProgress.isPending,
    quickAdjustStock: quickAdjust.mutate,
    isQuickAdjusting: quickAdjust.isPending,
    addItemToAudit: addItem.mutate,
    isAddingItem: addItem.isPending,
    removeItemFromAudit: removeItem.mutate,
    isRemovingItem: removeItem.isPending,
    deleteAuditSession: deleteSession.mutate,
    isDeletingSession: deleteSession.isPending,
  };
};
