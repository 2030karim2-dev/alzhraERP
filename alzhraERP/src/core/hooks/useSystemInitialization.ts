import { useEffect, useRef } from 'react';
import { useAuth } from '../../features/auth/hooks';
import { useAuthStore } from '../../features/auth/store';
import { useCommandPalette } from '../../features/command/hooks';
import { useI18nStore } from '../../lib/i18nStore';
import { notificationService } from '../../features/notifications/service';
import { useLocalizationSettings } from '../../features/settings/settingsStore';
import { useSoundStore } from '../../features/notifications/store';
import { initAPM } from '../utils/initAPM';
import { useRealtimeSync } from '../../lib/hooks/useRealtimeSync';

export const useSystemInitialization = () => {
  const hasBootstrappedSystem = useRef(false);
  const { initialize } = useAuth();
  const { user } = useAuthStore();
  const { openPalette } = useCommandPalette();
  const { lang, initializeLang, setLang } = useI18nStore();
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
    if (hasBootstrappedSystem.current) return;

    hasBootstrappedSystem.current = true;

    // Boot APM first so all subsequent logs are captured
    initAPM();

    initialize();
    initializeLang();
  }, [initialize, initializeLang]);

  // 1b. Enrich APM session context once user is identified
  useEffect(() => {
    if (!user?.id) return;
    initAPM({
      ...(user.id && { userId: user.id }),
      ...(user.company_id && { companyId: user.company_id }),
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
    const interval = setInterval(
      () => {
        notificationService.checkSystemHealth(user.company_id!);
      },
      1000 * 60 * 10
    );

    return () => {
      clearInterval(interval);
    };
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
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [openPalette]);

  // ملاحظة: كانت هناك حلقة "REPLAY_ACTIONS" عبر Service Worker اليدوي (sw.js)
  // لكن هذا الـ SW غير مسجَّل إطلاقاً (vite-plugin-pwa يولّد SW خاصاً به)،
  // فلا يُرسَل أي حدث REPLAY_ACTIONS — كانت الحلقة كوداً ميتاً. مزامنة الأوفلاين
  // الفعلية تتم عبر `sync-store` + `useSyncQueue` في ReactQueryProvider
  // (processSyncMutation) عند عودة الاتصال.
};
