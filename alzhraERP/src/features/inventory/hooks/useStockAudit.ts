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
        queryFn: () => user?.company_id ? inventoryService.getAuditSessions(user.company_id) : Promise.resolve([] as any[]),
        enabled: !!user?.company_id
    });
};

/** جلب تفاصيل جلسة جرد مع Realtime subscription */
export const useAuditSession = (sessionId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['audit_session', sessionId],
        queryFn: () => sessionId ? inventoryService.getAuditSessionDetails(sessionId) : Promise.reject('No session ID'),
        enabled: !!sessionId
    });

    useEffect(() => {
        if (!sessionId) return;

        const channelKey = `audit_session_${sessionId}`;
        const globalAny = window as any;
        if (!globalAny.__ALZ_AUDIT_CHANNELS__) {
            globalAny.__ALZ_AUDIT_CHANNELS__ = new Map<string, any>();
        }
        const registry: Map<string, any> = globalAny.__ALZ_AUDIT_CHANNELS__;

        // Reuse existing channel if already subscribed (prevents race condition)
        if (!registry.has(channelKey)) {
            const channel = supabase
                .channel(channelKey)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'audit_items', filter: `session_id=eq.${sessionId}` },
                    (payload: any) => {
                        logger.debug('Audit item changed:', payload);
                        queryClient.invalidateQueries({ queryKey: ['audit_session', sessionId] });
                    }
                )
                .subscribe((status: any) => {
                    if (status === 'SUBSCRIBED') {
                        logger.debug('Audit', `Realtime channel [${channelKey}] subscribed`);
                    }
                });

            registry.set(channelKey, channel);
        }

        return () => { /* no-op: keep channel alive for stability */ };
    }, [sessionId, queryClient]);

    return query;
};

/** mutations خاصة بجلسات الجرد والتسوية السريعة */
export const useInventoryMutations = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();

    const transfer = useMutation({
        mutationFn: (data: any) => {
            if (!user?.company_id || !user.id) throw new Error("Auth error");
            return inventoryService.createTransfer({ ...data, company_id: user.company_id, user_id: user.id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            showToast("تمت المناقلة بنجاح", 'success');
        },
        onError: (err: any, variables) => {
            if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.status === 0) {
                syncStore.enqueue({
                    mutationKey: ['inventory', 'transfer'],
                    variables: { ...variables, company_id: user?.company_id, user_id: user?.id }
                });
                showToast("تمت المناقلة محلياً (وضع عدم الاتصال).", 'info');
                return;
            }
            showToast("فشل المناقلة: " + err.message, 'error');
        }
    });

    const audit = useMutation({
        mutationFn: (data: any) => {
            if (!user?.company_id || !user.id) throw new Error("Auth error");
            return inventoryService.startAudit(data, user.company_id, user.id);
        },
        onSuccess: (newSession: any) => {
            queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
            showToast("تم بدء جلسة الجرد", 'success');
            return newSession;
        },
        onError: (err: any, variables) => {
            if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.status === 0) {
                syncStore.enqueue({
                    mutationKey: ['inventory', 'start_audit'],
                    variables: { ...variables, company_id: user?.company_id, user_id: user?.id }
                });
                showToast("بدء الجرد محلياً (وضع عدم الاتصال).", 'info');
                return;
            }
            showToast("فشل بدء الجرد: " + err.message, 'error');
        }
    });

    const finalize = useMutation({
        mutationFn: ({ sessionId, items }: { sessionId: string, items: any[] }) => {
            if (!user?.company_id || !user.id) throw new Error("Auth error");
            return inventoryService.finalizeAudit(sessionId, items, user.company_id, user.id);
        },
        onSuccess: (_, { sessionId }) => {
            queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
            queryClient.invalidateQueries({ queryKey: ['audit_session', sessionId] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            showToast("تم إغلاق الجرد وترحيل الفروقات", 'success');
        }
    });

    const saveProgress = useMutation({
        mutationFn: (items: any[]) => inventoryService.saveAuditProgress(items),
        onSuccess: () => {
            showToast("تم حفظ التقدم", 'info', { hideAfter: 2000 });
        },
        onError: (err: any, items) => {
            if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.status === 0) {
                syncStore.enqueue({ mutationKey: ['inventory', 'save_audit_progress'], variables: { items } });
                return;
            }
        }
    });

    const quickAdjust = useMutation({
        mutationFn: (items: { product_id: string; warehouse_id: string; quantity: number }[]) => {
            if (!user?.company_id || !user.id) throw new Error("Auth error");
            return inventoryService.quickAdjustStock(user.company_id, items, user.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['audit_sessions'] });
            showToast("تم إضافة التسويات السريعة بنجاح", 'success');
        },
        onError: (err: any) => {
            showToast("فشلت التسوية السريعة: " + err.message, 'error');
        }
    });

    const addItem = useMutation({
        mutationFn: ({ sessionId, productId, expectedQuantity }: { sessionId: string; productId: string; expectedQuantity: number }) => {
            return inventoryService.addAuditItem(sessionId, productId, expectedQuantity, user?.company_id || '', user?.id || '');
        },
        onSuccess: (_, { sessionId }) => {
            queryClient.invalidateQueries({ queryKey: ['audit_session', sessionId] });
        },
        onError: (err: any) => {
            showToast("فشل إضافة الصنف: " + err.message, 'error');
        }
    });

    const removeItem = useMutation({
        mutationFn: (itemId: string) => {
            return inventoryService.deleteAuditItem(itemId);
        },
        onSuccess: (_, _itemId) => {
            queryClient.invalidateQueries({ queryKey: ['audit_session'] });
            showToast("تم إزالة الصنف من الجلسة", 'info');
        },
        onError: (err: any) => {
            showToast("فشل إزالة الصنف: " + err.message, 'error');
        }
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
    };
};
