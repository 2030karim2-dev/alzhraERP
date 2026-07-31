// ============================================
// useErrorHandler - Hook مركزي لمعالجة الأخطاء
// Al-Zahra Smart ERP
// ============================================

import { useCallback } from 'react';
import { AppError, ErrorCode } from '../types/common';
import { logger } from '../utils/logger';

/**
 * Custom hook for centralized error handling
 * Replaces: catch (error: any) { ... }
 * 
 * @example
 * const { handleError } = useErrorHandler();
 * 
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleError(error, 'context description');
 * }
 */
export const useErrorHandler = (options: {
    showToast?: boolean;
    logError?: boolean;
    onError?: (error: AppError) => void;
} = {}) => {
    const { logError = true, onError } = options;

    const handleError = useCallback((error: unknown, context?: string): AppError => {
        // تحويل أي خطأ إلى AppError
        let appError: AppError;

        if (error instanceof AppError) {
            appError = error;
        } else if (error instanceof Error) {
            appError = new AppError(
                error.message,
                ErrorCode.UNKNOWN,
                500,
                { originalError: error.name, context }
            );
        } else {
            appError = new AppError(
                'حدث خطأ غير متوقع',
                ErrorCode.UNKNOWN,
                500,
                { context }
            );
        }

        // تسجيل الخطأ
        if (logError) {
            logger.error('ErrorHandler', context || 'Unhandled error', appError);
        }

        // استدعاء callback
        onError?.(appError);

        return appError;
    }, [logError, onError]);

    const handleErrorAsync = useCallback(async function <T>(
        promise: Promise<T>,
        context?: string
    ): Promise<[T, null] | [null, AppError]> {
        try {
            const data = await promise;
            return [data, null];
        } catch (error) {
            const appError = handleError(error, context);
            return [null, appError];
        }
    }, [handleError]);

    return { handleError, handleErrorAsync };
};

/**
 * Safe error handler that doesn't throw - returns default value on error
 */
export const useSafeErrorHandler = () => {
    const { handleError } = useErrorHandler();

    const safeHandle = useCallback(<T>(error: unknown, defaultValue: T, context?: string): T => {
        handleError(error, context);
        return defaultValue;
    }, [handleError]);

    return { safeHandle };
};
