import { useEffect } from 'react';
import { useAuth } from '../../features/auth/hooks';
import { useAuthStore } from '../../features/auth/store';
import { useCommandPalette } from '../../features/command/hooks';
import { useI18nStore } from '../../lib/i18nStore';
import { useQueryClient } from '@tanstack/react-query';
import { offlineService } from '../../lib/offlineService';
import { salesService } from '../../features/sales/service';
import { useFeedbackStore } from '../../features/feedback/store';
import { notificationService } from '../../features/notifications/service';
import { useLocalizationSettings } from '../../features/settings/settingsStore';
import { useSoundStore } from '../../features/notifications/store';
import { logger } from '../utils/logger';
import { initAPM } from '../utils/initAPM';
import { useRealtimeSync } from '../../lib/hooks/useRealtimeSync';

let hasBootstrappedSystem = false;

export const useSystemInitialization = () => {
  const { initialize } = useAuth();
  const { user } = useAuthStore();
  const { openPalette } = useCommandPalette();
  const { lang, initializeLang, setLang } = useI18nStore();
  const queryClient = useQueryClient();
  const { showToast } = useFeedbackStore();
  const localizationSettings = useLocalizationSettings();
  const { setUserInteracted } = useSoundStore();

  // Initialize Global Realtime Sync
  useRealtimeSync();
  // 0. Track first user interaction for AudioContext / Autoplay policies
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted();
      // Clean up after first interaction
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [setUserInteracted]);

  // 1. Initialize Auth & Language once on mount
  useEffect(() => {
    if (hasBootstrappedSystem) return;

    hasBootstrappedSystem = true;

    // Boot APM first so all subsequent logs are captured
    initAPM();

    initialize();
    initializeLang();
  }, [initialize, initializeLang]);

  // 1b. Enrich APM session context once user is identified
  useEffect(() => {
    if (!user?.id) return;
    initAPM({
      ...(user.id          && { userId:      user.id }),
      ...(user.company_id  && { companyId:   user.company_id }),
      ...(user.company_name && { companyName: user.company_name }),
    });
  }, [user?.id, user?.company_id, user?.company_name]);

  // 2. Apply localization settings when they change
  useEffect(() => {
    if (localizationSettings?.default_language && localizationSettings.default_language !== lang) {
      setLang(localizationSettings.default_language);
    }
  }, [lang, localizationSettings?.default_language, setLang]);

  // 2. Smart Notifications & Health Check
  useEffect(() => {
    if (!user?.company_id) return;
    // Run checks on mount
    notificationService.checkSystemHealth(user.company_id);

    // Run interval checks every 10 minutes
    const interval = setInterval(() => {
      notificationService.checkSystemHealth(user.company_id!);
    }, 1000 * 60 * 10);

    return () => clearInterval(interval);
  }, [user?.company_id]);

  // 3. Global Keyboard Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openPalette]);

  // 4. Background Synchronization (Service Worker)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'REPLAY_ACTIONS') {
        showToast('إعادة الاتصال بالشبكة، جاري مزامنة البيانات...', 'info');
        const actions = event.data.payload || [];
        let success = true;
        for (const action of actions) {
          try {
            switch (action.type) {
              case 'CREATE_INVOICE':
                // Fix: Corrected method name from createInvoice to processNewSale and fixed argument ordering
                await salesService.processNewSale(action.payload.companyId, action.payload.userId, action.payload.data);
                break;
              // Future: Add cases for CREATE_PURCHASE, etc.
            }
          } catch (error) {
            success = false;
            logger.error('Sync', 'Failed to replay action', { action, error: error as Error });
            showToast(`فشل مزامنة العملية: ${action.type}`, 'error');
            break; // Stop replaying sequence on failure
          }
        }

        if (success) {
          await offlineService.clearQueue();
          showToast('تمت مزامنة جميع البيانات بنجاح!', 'success');
          await queryClient.invalidateQueries(); // Refresh all data
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [queryClient, showToast]);
};
