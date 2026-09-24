/**
 * debtStatementExport — بناء حمولة كشف الحساب (منطق نقي: بلا React وبلا شبكة).
 *
 * M-4: المكوّن للعرض، والـ Hook ينسّق (شركة → خدمة الكشف → توليد الملف)،
 * وهذا الملف يحوّل بيانات الشركة وحركات الكشف إلى الحمولة التي يفهمها
 * `exportStatementToExcel` — دوال صغيرة صريحة الأنواع تُختبر بلا متصفح.
 */
import type {
  CompanyInfo,
  StatementEntry,
  StatementExportOptions,
} from '../../parties/utils/statementExcelExporter';
import type { StatementMovement } from '../../parties/service';
import type { FollowUpDashboardRow } from '../types';

/** أعمدة ترويسة اختيارية غير موجودة في النوع المولَّد لجدول `companies`. */
export interface CompanyDocExtras {
  commercial_reg?: string | undefined;
  bank_name?: string | undefined;
  bank_account_iban?: string | undefined;
}

/** المصدر البنيوي لبيانات الشركة (صف `companies` + الأعمدة الاختيارية). */
export interface CompanyHeaderSource extends CompanyDocExtras {
  name_ar?: string | null | undefined;
  address?: string | null | undefined;
  phone?: string | null | undefined;
  tax_number?: string | null | undefined;
}

/** الاسم الاحتياطي حين لا تحمل الشركة اسماً عربياً. */
const FALLBACK_COMPANY_NAME = 'منظومة الزهراء المحاسبية';

/** نص آمن: null/undefined/'' → البديل المطلوب (بلا انهيار على الحقول الغائبة). */
const orFallback = (value: string | null | undefined, fallback: string): string =>
  value !== null && value !== undefined && value !== '' ? value : fallback;

/** ترويسة الشركة في كشف الحساب (اسم/عنوان/هاتف/ضريبي/سجل/بنك). */
export const buildCompanyDoc = (company: CompanyHeaderSource | null): CompanyInfo => ({
  name_ar: orFallback(company?.name_ar, FALLBACK_COMPANY_NAME),
  address: orFallback(company?.address, ''),
  phone: orFallback(company?.phone, ''),
  tax_number: orFallback(company?.tax_number, ''),
  commercial_reg: orFallback(company?.commercial_reg, ''),
  bank_name: orFallback(company?.bank_name, ''),
  bank_account_iban: orFallback(company?.bank_account_iban, ''),
});

/** حركات الكشف بصيغة المصدِّر — القيم الاختيارية تُطبَّع إلى '' أو 0. */
export const toStatementEntries = (movements: readonly StatementMovement[]): StatementEntry[] =>
  movements.map(movement => ({
    date: movement.date,
    operation_type: movement.operation_type ?? '',
    reference_no: movement.ref,
    desc: movement.desc,
    debit: movement.debit,
    credit: movement.credit,
    balance: movement.balance ?? 0,
    payment_status: movement.payment_status,
  }));

/**
 * خيارات المصدِّر من صف المتابعة: النوع عميل دائماً (لوحة الديون للمدينين)،
 * ورقم الهاتف يُمرَّر فقط عند وجوده حتى لا تُكتب خصائص undefined صراحةً.
 */
export const buildExportOptions = (row: FollowUpDashboardRow): StatementExportOptions => {
  const phone = row.party_phone;
  return {
    currencyCode: row.currency_code,
    partyType: 'customer',
    partyCategory: row.category,
    ...(phone !== null && phone !== '' ? { partyPhone: phone } : {}),
  };
};
