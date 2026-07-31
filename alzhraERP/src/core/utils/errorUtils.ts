
/**
 * محرك معالجة الأخطاء الذكي لنظام الزهراء
 */
export interface AppError {
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionLabel?: string;
}

export const parseError = (error: any): AppError => {
  const errorObj = error instanceof Error ? error : (typeof error === 'object' && error !== null ? error : new Error(String(error)));
  
  const code = errorObj?.code || 'UNKNOWN';
  const rawMessage = errorObj?.message || String(errorObj);
  const lowerMsg = rawMessage.toLowerCase();

  // Network Errors - Catch generic fetch failures
  if (
    lowerMsg.includes('failed to fetch') || 
    lowerMsg.includes('networkerror') || 
    lowerMsg.includes('load failed') ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('connection refused')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
      severity: 'high',
      actionLabel: 'تحديث'
    };
  }

  // خوارزمية تحديد الرسالة بناءً على الكود
  switch (code) {
    case '23505': // Unique violation
      return {
        code,
        message: 'هذا السجل (رقم SKU أو الاسم) موجود مسبقاً في النظام.',
        severity: 'medium',
        actionLabel: 'تغيير القيمة'
      };
    case 'PGRST116':
      return {
        code,
        message: 'الجداول المطلوبة غير موجودة في قاعدة البيانات.',
        severity: 'critical',
        actionLabel: 'تحديث الهيكل'
      };
    case '42501':
      return {
        code,
        message: 'عذراً، لا تمتلك الصلاحيات الكافية لتنفيذ هذه العملية.',
        severity: 'high',
        actionLabel: 'طلب إذن'
      };
    case 'AuthApiError':
    case 'invalid_credentials':
      return {
        code,
        message: 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.',
        severity: 'medium'
      };
    case 'user_already_exists':
      return {
        code,
        message: 'البريد الإلكتروني مسجل مسبقاً.',
        severity: 'medium'
      };
    default:
      return {
        code,
        message: rawMessage || 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.',
        severity: 'medium'
      };
  }
};
