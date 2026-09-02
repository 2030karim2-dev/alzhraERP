/**
 * محرك معالجة الأخطاء الذكي لنظام الزهراء
 */
export interface AppError extends Error {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionLabel?: string;
}

/**
 * Builds a real `Error` instance carrying the parsed metadata, so thrown
 * values stay `instanceof Error` for every downstream catch block (previously
 * parseError threw plain object literals, breaking `instanceof` checks).
 */
const makeAppError = (
  code: string,
  message: string,
  severity: AppError['severity'],
  actionLabel?: string
): AppError => {
  const appError = Object.assign(new Error(message), { code, severity }) as AppError;
  if (actionLabel !== undefined) {
    appError.actionLabel = actionLabel;
  }
  return appError;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const parseError = (error: unknown): AppError => {
  const errorRecord = isRecord(error) ? error : undefined;
  const code = typeof errorRecord?.code === 'string' ? errorRecord.code : 'UNKNOWN';
  const rawMessage =
    error instanceof Error
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
    return makeAppError(
      'NETWORK_ERROR',
      'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
      'high',
      'تحديث'
    );
  }

  const details = typeof errorRecord?.details === 'string' ? errorRecord.details.toLowerCase() : '';
  const combinedContext = `${lowerMsg} ${details}`;

  // Unique violation check (code 23505 or raw duplicate message)
  if (
    code === '23505' ||
    combinedContext.includes('duplicate key') ||
    combinedContext.includes('23505')
  ) {
    let customMsg = 'هذا السجل (رقم SKU أو الاسم) موجود مسبقاً في النظام.';
    if (combinedContext.includes('barcode') || combinedContext.includes('بار كود')) {
      customMsg = 'الباركود المدخل مسجل مسبقاً لصنف آخر في نفس المنشأة.';
    } else if (combinedContext.includes('sku')) {
      customMsg = 'رمز الصنف (SKU) مسجل مسبقاً في قائمة المنتجات.';
    } else if (combinedContext.includes('part_number') || combinedContext.includes('part_brand')) {
      customMsg = 'رقم القطعة مع الماركة مسجل مسبقاً لصنف آخر.';
    } else if (combinedContext.includes('phone') || combinedContext.includes('هاتف')) {
      customMsg = 'رقم الهاتف مسجل مسبقاً لجهة تعامل أخرى (عميل/مورد).';
    } else if (combinedContext.includes('tax_number') || combinedContext.includes('الضريبي')) {
      customMsg = 'الرقم الضريبي مسجل مسبقاً في النظام.';
    } else if (
      combinedContext.includes('fin_accounts') ||
      combinedContext.includes('code') ||
      combinedContext.includes('الحساب')
    ) {
      customMsg = 'رمز الحساب المالي مسجل مسبقاً في شجرة ودليل الحسابات.';
    } else if (
      combinedContext.includes('invoice_number') ||
      combinedContext.includes('idempotency')
    ) {
      customMsg = 'تم إرسال هذه الفاتورة مسبقاً أو يوجد تكرار في رقم الفاتورة.';
    } else if (combinedContext.includes('payment_number') || combinedContext.includes('bond')) {
      customMsg = 'رقم السند مسجل مسبقاً في النظام.';
    } else if (combinedContext.includes('name_ar') || combinedContext.includes('name')) {
      customMsg = 'الاسم المدخل مسجل مسبقاً في النظام لنفس المنشأة.';
    }
    return makeAppError('23505', customMsg, 'medium', 'تغيير القيمة');
  }

  // خوارزمية تحديد الرسالة بناءً على الكود
  switch (code) {
    case 'PGRST116':
      // PostgREST: "JSON object requested, multiple (or no) rows returned" —
      // عادةً ما يحدث عند طلب سجل واحد (.single()/.maybeSingle()) دون نتيجة
      // (سجل محذوف، أو مفلتر بـ RLS، أو عدة سجلات). ليست مشكلة هيكلية إطلاقاً.
      return makeAppError(
        code,
        'لم يتم العثور على السجل المطلوب (أو توجد عدة نتائج حيث كان متوقعاً سجل واحد).',
        'medium'
      );
    case '42501':
      return makeAppError(
        code,
        'عذراً، لا تمتلك الصلاحيات الكافية لتنفيذ هذه العملية.',
        'high',
        'طلب إذن'
      );
    case 'AuthApiError':
    case 'invalid_credentials':
      return makeAppError(
        code,
        'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.',
        'medium'
      );
    case 'user_already_exists':
      return makeAppError(code, 'البريد الإلكتروني مسجل مسبقاً.', 'medium');
    default: {
      // رسائل استثناءات دوالنا الداخلية (RAISE EXCEPTION '...') عربية وصريحة
      // ومقصودة للمستخدم — مرّرها كما هي بدلاً من رسالة عامة مبهمة
      // (مثال: 'لا يوجد مستودع للفرع' أو 'حساب الدائنين (2100) مفقود').
      if (/[\u0600-\u06FF]/.test(rawMessage)) {
        return makeAppError(code, rawMessage, 'medium');
      }
      // Log the actual error for debugging but don't expose internals to users
      if (import.meta.env.DEV) {
        console.error('[ErrorUtils] Unhandled error:', code, rawMessage);
      }
      return makeAppError(code, 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.', 'medium');
    }
  }
};
