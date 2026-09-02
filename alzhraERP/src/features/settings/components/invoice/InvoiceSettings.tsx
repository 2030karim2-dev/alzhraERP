import React from 'react';
import {
  FileText,
  Hash,
  Eye,
  MessageSquare,
  Save,
  CheckCircle,
  Settings2,
  Image,
  Printer,
  CreditCard,
  Layout,
  ReceiptText,
  Building,
} from 'lucide-react';
import { cn } from '../../../../core/utils';
import { SettingToggle } from '../shared/SettingToggle';
import { SettingSection } from '../shared/SettingSection';
import { SettingField } from '../shared/SettingField';
import { useInvoiceSettings } from '../../hooks/useInvoiceSettings';

export const InvoiceSettings: React.FC = () => {
  const { invoice, saved, previewNumber, handleUpdate, handleSave, handleReset } =
    useInvoiceSettings();

  return (
    <div className="animate-in fade-in p-3 duration-500 max-md:p-3 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3 max-md:gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-500/20 max-md:p-2.5">
              <ReceiptText size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tighter text-gray-800 dark:text-slate-100 md:text-base">
                إعدادات الفواتير
              </h2>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 md:text-[10px]">
                تخصيص نظام الفوترة والترقيم والطباعة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 max-md:gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 transition-colors hover:text-rose-500 md:text-[10px]"
            >
              إعادة ضبط
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[10px] font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 max-md:gap-2 md:py-2.5 md:text-xs',
                saved
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'
              )}
            >
              {saved ? <CheckCircle size={14} /> : <Save size={14} />}
              {saved ? 'تم الحفظ ✓' : 'حفظ'}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════ 1. ترقيم الفواتير ═══════════════════════════ */}
        <SettingSection
          icon={<Hash size={16} />}
          title="ترقيم الفواتير"
          subtitle="إعداد بادئات وتنسيق الأرقام"
          color="bg-blue-600 shadow-blue-500/20"
        >
          <div className="space-y-4">
            {/* Preview */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-l from-blue-50 to-indigo-50 p-4 dark:border-blue-900/20 dark:from-blue-900/10 dark:to-indigo-900/10 max-md:p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                معاينة رقم الفاتورة
              </p>
              <p className="font-mono text-lg font-bold tracking-wider text-blue-800 dark:text-blue-200 md:text-xl">
                {previewNumber}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-3">
              <SettingField
                label="بادئة فاتورة البيع"
                value={invoice.invoice_prefix}
                onChange={v => {
                  handleUpdate({ invoice_prefix: v });
                }}
                dir="ltr"
              />
              <SettingField
                label="رقم البداية"
                type="number"
                value={invoice.invoice_start_number}
                onChange={v => {
                  handleUpdate({ invoice_start_number: v });
                }}
              />
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                  تنسيق اللاحقة
                </label>
                <select
                  value={invoice.invoice_suffix_format}
                  onChange={e => {
                    handleUpdate({ invoice_suffix_format: e.target.value });
                  }}
                  className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="YYYY-MM-XXXX">YYYY-MM-XXXX (سنة-شهر-رقم)</option>
                  <option value="YYYY-XXXX">YYYY-XXXX (سنة-رقم)</option>
                  <option value="XXXX">XXXX (رقم فقط)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              <SettingField
                label="بادئة عرض السعر"
                value={invoice.quote_prefix}
                onChange={v => {
                  handleUpdate({ quote_prefix: v });
                }}
                dir="ltr"
              />
              <SettingField
                label="بادئة المرتجع"
                value={invoice.return_prefix}
                onChange={v => {
                  handleUpdate({ return_prefix: v });
                }}
                dir="ltr"
              />
            </div>
            <SettingToggle
              checked={invoice.auto_generate_number}
              onChange={v => {
                handleUpdate({ auto_generate_number: v });
              }}
              label="توليد الأرقام تلقائياً"
              description="النظام سيقوم بإنشاء رقم فاتورة تسلسلي عند كل فاتورة جديدة"
            />
          </div>
        </SettingSection>

        {/* ═══════════════════════════ 2. شروط الدفع ═══════════════════════════ */}
        <SettingSection
          icon={<CreditCard size={16} />}
          title="شروط الدفع"
          subtitle="إعدادات الاستحقاق والمهل الافتراضية"
          color="bg-emerald-600 shadow-emerald-500/20"
        >
          <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
            <SettingField
              label="مهلة الدفع الافتراضية (أيام)"
              type="number"
              value={invoice.default_payment_terms}
              onChange={v => {
                handleUpdate({ default_payment_terms: v });
              }}
            />
            <SettingField
              label="أيام الاستحقاق الافتراضية"
              type="number"
              value={invoice.default_due_date_days}
              onChange={v => {
                handleUpdate({ default_due_date_days: v });
              }}
            />
          </div>
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/20 dark:bg-amber-900/10 max-md:p-3">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 md:text-[10px]">
              ⏳ تاريخ الاستحقاق = تاريخ الفاتورة + مهلة الدفع. يمكن تعديله يدوياً لكل فاتورة.
            </p>
          </div>
        </SettingSection>

        {/* ═══════════════════════════ 3. تخصيص قالب الفاتورة ═══════════════════════════ */}
        <SettingSection
          icon={<Layout size={16} />}
          title="تخصيص قالب الفاتورة"
          subtitle="التحكم في شكل ومحتوى الفاتورة المطبوعة"
          color="bg-purple-600 shadow-purple-500/20"
        >
          <div className="space-y-5">
            {/* Template Selection */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                اختر نوع القالب
              </label>
              <div className="grid grid-cols-3 gap-3 max-md:gap-3">
                {(
                  [
                    {
                      id: 'simple',
                      label: 'بسيط',
                      desc: 'عرض أساسي بدون تفاصيل إضافية',
                      icon: <FileText size={20} />,
                    },
                    {
                      id: 'detailed',
                      label: 'تفصيلي',
                      desc: 'يشمل البيانات البنكية والخصم',
                      icon: <Eye size={20} />,
                    },
                    {
                      id: 'custom',
                      label: 'مخصص',
                      desc: 'تحكم كامل في كل العناصر',
                      icon: <Settings2 size={20} />,
                    },
                  ] as const
                ).map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      handleUpdate({ invoice_template: tmpl.id });
                    }}
                    className={cn(
                      'rounded-xl border-2 p-3 text-center transition-all max-md:p-3 md:p-4',
                      invoice.invoice_template === tmpl.id
                        ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-500/10 dark:bg-purple-900/10'
                        : 'border-gray-200 hover:border-purple-300 dark:border-slate-700 dark:hover:border-purple-800'
                    )}
                  >
                    <div
                      className={cn(
                        'mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg',
                        invoice.invoice_template === tmpl.id
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-400 dark:bg-slate-800'
                      )}
                    >
                      {tmpl.icon}
                    </div>
                    <p
                      className={cn(
                        'text-[10px] font-bold uppercase md:text-xs',
                        invoice.invoice_template === tmpl.id
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-gray-500'
                      )}
                    >
                      {tmpl.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-gray-400 md:text-[10px]">
                      {tmpl.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Display Options */}
            <div className="border-t border-gray-100 pt-4 dark:border-slate-800">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                عناصر العرض
              </p>
              <div className="space-y-1 divide-y divide-gray-50 dark:divide-slate-800/50">
                <SettingToggle
                  checked={invoice.show_logo}
                  onChange={v => {
                    handleUpdate({ show_logo: v });
                  }}
                  label="عرض شعار الشركة"
                  description="يظهر في ترويسة الفاتورة المطبوعة"
                />
                <SettingToggle
                  checked={invoice.show_bank_details}
                  onChange={v => {
                    handleUpdate({ show_bank_details: v });
                  }}
                  label="عرض البيانات البنكية"
                  description="يعرض معلومات الحساب البنكي وال IBAN في التذييل"
                />
              </div>
            </div>

            {/* Invoice Preview Mini */}
            <div className="border-t border-gray-100 pt-4 dark:border-slate-800">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                معاينة مصغرة
              </p>
              <div className="max-w-sm space-y-2 rounded-xl border-2 border-gray-200 bg-white p-4 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800 max-md:p-4 md:text-[10px]">
                {/* Mini invoice preview */}
                {invoice.show_logo && (
                  <div className="flex items-center gap-2 border-b border-dashed border-gray-200 pb-2 dark:border-slate-700 max-md:gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30">
                      <Image size={10} className="text-blue-500" />
                    </div>
                    <span className="font-bold text-gray-600 dark:text-slate-300">شعار الشركة</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">رقم الفاتورة:</span>
                  <span className="font-bold text-gray-700 dark:text-slate-200">
                    {previewNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">التاريخ:</span>
                  <span className="font-bold text-gray-600 dark:text-slate-300">
                    {new Date().toLocaleDateString('ar-SA-u-nu-latn')}
                  </span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-2 dark:border-slate-700">
                  <div className="mt-1 flex justify-between">
                    <span className="text-gray-600 dark:text-slate-300">قطعة غيار ×2</span>
                    <span className="font-bold text-gray-700 dark:text-slate-200">500 ر.س</span>
                  </div>
                </div>
                <div className="flex justify-between border-t-2 border-gray-300 pt-2 dark:border-slate-600">
                  <span className="font-bold text-gray-700 dark:text-slate-200">الإجمالي</span>
                  <span className="font-bold text-blue-600">500 ر.س</span>
                </div>
                {invoice.show_bank_details && (
                  <div className="border-t border-dashed border-gray-200 pt-2 text-gray-400 dark:border-slate-700">
                    <span>IBAN: SA00 0000 0000 0000 0000</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SettingSection>

        {/* ═══════════════════════════ 4. بيانات ترويسة الفاتورة ═══════════════════════════ */}
        <SettingSection
          icon={<Building size={16} />}
          title="بيانات ترويسة الفاتورة"
          subtitle="المعلومات التي تظهر في أعلى الفاتورة المطبوعة"
          color="bg-blue-600 shadow-blue-500/20"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              <SettingField
                label="اسم الشركة (بالعربية)"
                value={invoice.company_name_ar}
                onChange={v => {
                  handleUpdate({ company_name_ar: v });
                }}
              />
              <SettingField
                label="اسم الشركة (بالانجليزية)"
                value={invoice.company_name_en}
                onChange={v => {
                  handleUpdate({ company_name_en: v });
                }}
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              <SettingField
                label="تخصص الشركة / النشاط"
                value={invoice.company_specialization}
                onChange={v => {
                  handleUpdate({ company_specialization: v });
                }}
              />
              <SettingField
                label="نص الترويسة الإضافي"
                value={invoice.invoice_header_text}
                onChange={v => {
                  handleUpdate({ invoice_header_text: v });
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              <SettingField
                label="رقم الهاتف"
                value={invoice.company_phone}
                onChange={v => {
                  handleUpdate({ company_phone: v });
                }}
                dir="ltr"
              />
              <SettingField
                label="البريد الإلكتروني"
                value={invoice.company_email}
                onChange={v => {
                  handleUpdate({ company_email: v });
                }}
                dir="ltr"
              />
            </div>
            <SettingField
              label="العنوان التفصيلي"
              value={invoice.company_address}
              onChange={v => {
                handleUpdate({ company_address: v });
              }}
            />
          </div>
        </SettingSection>

        {/* ═══════════════════════════ 5. الملاحظات والشروط ═══════════════════════════ */}
        <SettingSection
          icon={<MessageSquare size={16} />}
          title="الملاحظات والشروط"
          subtitle="نصوص افتراضية تُضاف تلقائياً للفواتير"
          color="bg-amber-500 shadow-amber-500/20"
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                ملاحظات الفاتورة (عربي)
              </label>
              <textarea
                value={invoice.default_notes_ar}
                onChange={e => {
                  handleUpdate({ default_notes_ar: e.target.value });
                }}
                rows={3}
                className="w-full resize-none rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                ملاحظات الفاتورة (EN)
              </label>
              <textarea
                value={invoice.default_notes_en}
                onChange={e => {
                  handleUpdate({ default_notes_en: e.target.value });
                }}
                rows={3}
                dir="ltr"
                className="w-full resize-none rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                الشروط والأحكام (عربي)
              </label>
              <textarea
                value={invoice.default_terms_ar}
                onChange={e => {
                  handleUpdate({ default_terms_ar: e.target.value });
                }}
                rows={3}
                className="w-full resize-none rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                الشروط والأحكام (EN)
              </label>
              <textarea
                value={invoice.default_terms_en}
                onChange={e => {
                  handleUpdate({ default_terms_en: e.target.value });
                }}
                rows={3}
                dir="ltr"
                className="w-full resize-none rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </SettingSection>

        {/* Bottom Info */}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-900/20 dark:bg-indigo-900/10 max-md:gap-3 max-md:p-3 md:p-4">
          <div className="mt-0.5 flex-shrink-0 rounded-lg bg-indigo-500 p-1 text-white max-md:p-1.5">
            <Printer size={12} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-indigo-800 dark:text-indigo-300 md:text-[10px]">
              تلميح
            </p>
            <p className="text-[10px] font-bold leading-relaxed text-indigo-600 dark:text-indigo-400 md:text-[10px]">
              يمكنك معاينة القالب المختار عند طباعة أي فاتورة. الإعدادات هنا تنطبق على جميع الفواتير
              الجديدة كقيم افتراضية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSettings;
