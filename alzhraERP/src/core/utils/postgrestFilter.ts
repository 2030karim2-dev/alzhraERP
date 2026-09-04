/**
 * أدوات بناء فلاتر PostgREST الآمنة.
 *
 * المشكلة: صيغة `.or()` في PostgREST تستخدم الفاصلة والأقواس كمحارف بنيوية،
 * فأي قيمة مدخلة من المستخدم تحتوي فاصلة (أو قوس) تكسر الفلتر وترمي خطأ 400 —
 * وغالباً يُبتلع الخطأ فيتوقف البحث عن العمل بصمت.
 *
 * الحل الموثق في PostgREST: لفّ القيمة بعلامتي اقتباس مزدوجتين تجعلها قيمة
 * حرفية آمنة حتى لو احتوت فواصل/أقواس/نقاط. يجب إزالة أي `"` من المدخل كي
 * لا يخرج النص عن الاقتباس.
 */

/** يزيل علامات الاقتباس المزدوجة والشرطة المائلة العكسية لمنع كسر أو تهريب سلاسل PostgREST المقتبسة. */
const stripQuotes = (raw: string): string => raw.replace(/["\\]/g, '');

/**
 * يبني فلتر `or()` يبحث عن النمط `%term%` في عدة أعمدة بـ ILIKE.
 * مثال الناتج: `name_ar.ilike."%مكس,123%",sku.ilike."%مكس,123%"`
 */
export const buildIlikeOrFilter = (columns: string[], term: string): string => {
  const safe = stripQuotes(term).trim();
  const pattern = `"%${safe}%"`;
  return columns.map(column => `${column}.ilike.${pattern}`).join(',');
};

/**
 * يبني فلتر `or()` لمطابقة تساوية دقيقة (تُستخدم للباركود/SKU) في عدة أعمدة.
 * مثال الناتج: `barcode.eq."123,456",sku.eq."123,456"`
 */
export const buildEqOrFilter = (columns: string[], value: string): string => {
  const safe = `"${stripQuotes(value)}"`;
  return columns.map(column => `${column}.eq.${safe}`).join(',');
};
