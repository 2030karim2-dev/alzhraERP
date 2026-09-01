/**
 * Desktop Notification Service — Native OS & Windows Toast Notifications.
 * Displays high-priority notification banners above all desktop applications
 * (even when the ERP browser window is minimized, hidden, or in the background).
 */
import { logger } from '../../core/utils/logger';

export interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string | undefined;
  badge?: string | undefined;
  tag?: string | undefined;
  link?: string | undefined;
  requireInteraction?: boolean | undefined;
  silent?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

let titleInterval: number | null = null;
let originalDocumentTitle = typeof document !== 'undefined' ? document.title : '';

/**
 * Checks if Desktop Notifications are supported by the browser.
 */
export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current notification permission state.
 */
export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Requests desktop notification permission from the operating system / browser.
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    logger.info('DesktopNotifications', `Permission status: ${permission}`);
    return permission;
  } catch (err) {
    logger.warn('DesktopNotifications', 'Permission request failed', err);
    return 'denied';
  }
}

/**
 * Flashes the document title in the taskbar/tab bar when an alert arrives while in background.
 */
export function startTitleFlash(alertText = '🔔 إشعار جديد!'): void {
  if (typeof document === 'undefined') return;
  if (!originalDocumentTitle) originalDocumentTitle = document.title;

  stopTitleFlash();

  let isAlert = true;
  titleInterval = window.setInterval(() => {
    document.title = isAlert ? `(${alertText}) الزهراء ERP` : originalDocumentTitle;
    isAlert = !isAlert;
  }, 1000);

  const handleFocus = () => {
    stopTitleFlash();
    window.removeEventListener('focus', handleFocus);
  };
  window.addEventListener('focus', handleFocus, { once: true });
}

/**
 * Stops any ongoing title flashing.
 */
export function stopTitleFlash(): void {
  if (titleInterval !== null) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  if (typeof document !== 'undefined' && originalDocumentTitle) {
    document.title = originalDocumentTitle;
  }
}

/**
 * Displays a native desktop notification banner over all operating system applications.
 */
export function showDesktopNotification(options: DesktopNotificationOptions): Notification | null {
  if (!isDesktopNotificationSupported()) return null;

  if (Notification.permission !== 'granted') {
    logger.debug('DesktopNotifications', 'Notification skipped: permission not granted');
    return null;
  }

  try {
    const icon = options.icon || '/pwa-icon-192.png';
    const badge = options.badge || '/pwa-icon-192.png';

    // requireInteraction: true keeps notification pinned on desktop above all apps until clicked
    const nativeNotif = new Notification(options.title, {
      body: options.body,
      icon,
      badge,
      tag: options.tag || `alzhra-${Date.now()}`,
      requireInteraction: options.requireInteraction ?? true,
      silent: options.silent ?? false,
    });

    nativeNotif.onclick = () => {
      try {
        // Bring ERP window to the front
        window.focus();
        nativeNotif.close();

        if (options.onClick) {
          options.onClick();
        } else if (options.link) {
          window.location.hash = options.link;
        }
      } catch (err) {
        logger.warn('DesktopNotifications', 'Notification click handler error', err);
      }
    };

    // Flash tab title if document is hidden / in background
    if (typeof document !== 'undefined' && document.hidden) {
      startTitleFlash('🔔 إشعار جديد');
    }

    return nativeNotif;
  } catch (err) {
    logger.warn('DesktopNotifications', 'Failed to display desktop notification', err);
    return null;
  }
}

/**
 * Sends a test notification to verify OS display above all apps.
 */
export async function sendTestDesktopNotification(): Promise<boolean> {
  const perm = await requestDesktopNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  const notif = showDesktopNotification({
    title: '🔔 نظام الزهراء ERP — إشعار سطح المكتب',
    body: 'تم تفعيل ظهور الإشعارات فوق جميع التطبيقات في جهازك بنجاح!',
    requireInteraction: true,
    tag: 'alzhra-test-notification',
  });

  return notif !== null;
}
