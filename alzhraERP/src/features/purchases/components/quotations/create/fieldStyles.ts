/**
 * أنماط الحقول المشتركة في نماذج عروض أسعار الموردين.
 * مصدر واحد يمنع انحراف الأنماط بين رأس النموذج وحقوله السفلية.
 */

/** نمط تسمية الحقل (مع أيقونة اختيارية). */
export const FIELD_LABEL_CLASS =
  'flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400';

/** نمط تسمية بلا أيقونة. */
export const PLAIN_FIELD_LABEL_CLASS = 'text-xs font-bold text-gray-600 dark:text-gray-400';

/** نمط حقول الإدخال/الاختيار. */
export const FIELD_INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800';
