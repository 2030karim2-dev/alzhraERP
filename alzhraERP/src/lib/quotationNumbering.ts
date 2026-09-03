/**
 * توليد أرقام عروض الأسعار بشكل آمن ضد التزامن (Race-Resistant).
 *
 * المشكلة السابقة: كان الرقم يُشتق من COUNT(*) + 1 في طلب منفصل عن الإدراج،
 * فأي إنشاءان متزامنان ينتجان نفس الرقم (QP-0007 مرتين)، ولا يوجد قيد UNIQUE
 * في قاعدة البيانات يمنع التكرار الصامت.
 *
 * الحل الحالي:
 * 1. جلب جميع أرقام العروض الموجودة للشركة والنوع في استعلام واحد (بما فيها
 *    المحذوفة ناعمياً عمداً — حتى لا يُعاد استخدام رقم ورد في مستندات مطبوعة).
 * 2. اختيار أول رقم حر بدءاً من (أكبر لاحقة رقمية + 1)، مع تخطي أي أرقام
 *    موجودة داخل التسلسل.
 * 3. الحاجز النهائي على مستوى قاعدة البيانات: الفهرس الفريد
 *    ux_quotations_company_type_number (migration 20260826000011) — فإن سبقتنا
 *    عملية متزامنة في آخر لحظة سيرفض الإدراج برسالة خطأ بدلاً من تكرار الرقم.
 */
import { supabase } from './supabaseClient';

export type QuotationKind = 'purchase' | 'sales';

const QUOTATION_PREFIX: Record<QuotationKind, string> = {
  purchase: 'QP',
  sales: 'QS',
};

/** حد أقصى للأرقام المشطوبة قبل الاستسلام — حماية من حلقة شبه لا نهائية */
const MAX_GAP_SCAN = 50;

/** حد أقصى لعدد الصفوف المقروءة لتوليد الرقم — تجاوزه يعني ضرورة الأرشفة */
const MAX_ROWS_SCAN = 10_000;

const trailingSequence = (quotationNumber: string): number => {
  const match = /(\d+)\s*$/.exec(quotationNumber);
  if (match === null) return 0;
  const sequence = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(sequence) ? sequence : 0;
};

export const formatQuotationNumber = (kind: QuotationKind, sequence: number): string =>
  `${QUOTATION_PREFIX[kind]}-${String(sequence).padStart(4, '0')}`;

export const generateQuotationNumber = async (
  companyId: string,
  kind: QuotationKind
): Promise<string> => {
  // لا فلترة deleted_at عمداً: الأرقام المحذوفة ناعمياً لا يجوز إعادة استخدامها
  // حتى تبقى المراجع الورقية والمرسلة سليمة تاريخياً.
  //
  // [FIX] ترتيب تنازلي بـ created_at: بدون ترتيب كان الحد 10_000 يُرجع عينة
  // اعتباطية من الصفوف، فتُشتق "أقصى لاحقة" من عينة لا تمثل الواقع فوق هذا
  // الحد ويتولّد رقم مكرر يرفضه قيد UNIQUE كخطأ للمستخدم. التسلسل يتزايد
  // زمنياً بحكم التصميم، فالأحدث يحمل الأرقام الأعلى.
  const { data, error } = await supabase
    .from('quotations')
    .select('quotation_number')
    .eq('company_id', companyId)
    .eq('type', kind)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS_SCAN);

  if (error !== null) {
    throw new Error(`تعذر توليد رقم عرض السعر: ${error.message}`);
  }

  const usedNumbers = new Set<string>();
  let maxSequence = 0;
  for (const row of (data ?? []) as Array<{ quotation_number: string | null }>) {
    const number = row.quotation_number;
    if (number === null || number === '') continue;
    usedNumbers.add(number);
    maxSequence = Math.max(maxSequence, trailingSequence(number));
  }

  let candidate = maxSequence + 1;
  while (usedNumbers.has(formatQuotationNumber(kind, candidate))) {
    candidate += 1;
    if (candidate > maxSequence + MAX_GAP_SCAN) {
      throw new Error(
        `تعذر إيجاد رقم عرض سعر فريد بعد فحص ${MAX_GAP_SCAN} رقماً متتالياً — راجع تسلسل أرقام العروض (${QUOTATION_PREFIX[kind]})`
      );
    }
  }

  return formatQuotationNumber(kind, candidate);
};
