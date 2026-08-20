
/**
 * محرك معالجة الأخطاء الذكي لنظام الزهراء
 */
export interface AppError {
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionLabel?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const parseError = (error: unknown): AppError => {
  const errorRecord = isRecord(error) ? error : undefined;
  const code = typeof errorRecord?.code === 'string' ? errorRecord.code : 'UNKNOWN';
  const rawMessage = error instanceof Error
    ? error.message
    : typeof errorRecord?.message === 'string'
      ? errorRecord.message
      : String(error);
  const lowerMsg = rawMessage.toLowerCase();

  // Network Errors - Catch generic fetch failures
  if (
    lowerMsg.includes('failed to fetch') || 
    lowerMsg.includes('fetch failed') || 
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
      // PostgREST: "JSON object requested, multiple (or no) rows returned" —
      // عادةً ما يحدث عند طلب سجل واحد (.single()/.maybeSingle()) دون نتيجة
      // (سجل محذوف، أو مفلتر بـ RLS، أو عدة سجلات). ليست مشكلة هيكلية إطلاقاً.
      return {
        code,
        message: 'لم يتم العثور على السجل المطلوب (أو توجد عدة نتائج حيث كان متوقعاً سجل واحد).',
        severity: 'medium'
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
    default: {
      // رسائل استثناءات دوالنا الداخلية (RAISE EXCEPTION '...') عربية وصريحة
      // ومقصودة للمستخدم — مرّرها كما هي بدلاً من رسالة عامة مبهمة
      // (مثال: 'لا يوجد مستودع للفرع' أو 'حساب الدائنين (2100) مفقود').
      if (/[\u0600-\u06FF]/.test(rawMessage)) {
        return {
          code,
          message: rawMessage,
          severity: 'medium'
        };
      }
      // Log the actual error for debugging but don't expose internals to users
      if (import.meta.env.DEV) {
        console.error('[ErrorUtils] Unhandled error:', code, rawMessage);
      }
      return {
        code,
        message: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.',
        severity: 'medium'
      };
    }
  }
};
