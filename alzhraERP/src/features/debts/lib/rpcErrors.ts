/**
 * رسائل عربية لأكواد استثناءات دوال التحصيل (RPC).
 * خريطة ثابتة (Map) بدل سلسلة switch طويلة — آمنة من فهرسة الكائنات.
 * رفض الصلاحيات (42501) يبقى على المحرك المركزي الموحّد في errorUtils.
 */

const DEBT_RPC_MESSAGES = new Map<string, string>([
  ['INVALID_TASK', 'المهمة غير موجودة أو تم حذفها.'],
  ['INVALID_PARTY', 'أحد العملاء المحددين غير تابع لهذه المنشأة.'],
  ['INVALID_PARTY_LIST', 'لم يتم تحديد أي عميل.'],
  ['INVALID_COLLECTOR', 'المحصّل المحدد ليس عضواً في المنشأة.'],
  ['INVALID_PRIORITY', 'أولوية الإسناد غير صالحة.'],
  ['INVALID_ACTIVITY_TYPE', 'نوع النشاط غير مدعوم.'],
  ['INVALID_PARTY_OR_TYPE', 'الطرف أو النوع غير صالح.'],
  ['SUBJECT_REQUIRED', 'موضوع النشاط مطلوب.'],
]);

/** يحوّل رمز خطأ الخادم إلى رسالة عربية واضحة (أو يعيد النص كما هو). */
export const debtRpcErrorMessage = (message: string | null | undefined): string => {
  const code = (message ?? '').trim();
  if (code === '') return 'حدث خطأ غير متوقع.';
  return DEBT_RPC_MESSAGES.get(code) ?? code;
};
