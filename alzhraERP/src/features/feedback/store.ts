
import { create } from 'zustand';
import { AppError, parseError } from '../../core/utils/errorUtils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  details?: AppError | undefined; // إضافة تفاصيل الخطأ
}

interface FeedbackState {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, rawError?: any) => void;
  hideToast: (id: string) => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  toasts: [],
  showToast: (message, type = 'success', rawError) => {
    const id = Math.random().toString(36).substring(2, 9);
    const details = rawError ? parseError(rawError) : undefined;

    // إذا كان هناك خطأ تقني، ندمج رسالته مع الرسالة المخصصة
    const finalMessage = details ? `${message}: ${details.message}` : message;

    set((state) => ({
      toasts: [...state.toasts, { id, message: finalMessage, type, details }]
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 5000);
  },
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  }
}));
