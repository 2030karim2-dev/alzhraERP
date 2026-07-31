import React from 'react';
import { FileText, Hash, Eye, MessageSquare, Save, CheckCircle, Settings2, Image, Printer, CreditCard, Layout, ReceiptText, Building } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { SettingToggle } from '../shared/SettingToggle';
import { SettingSection } from '../shared/SettingSection';
import { SettingField } from '../shared/SettingField';
import { useInvoiceSettings } from '../../hooks/useInvoiceSettings';

export const InvoiceSettings: React.FC = () => {
    const { invoice, saved, previewNumber, handleUpdate, handleSave, handleReset } = useInvoiceSettings();

    return (
        <div className="p-3 md:p-6 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                            <ReceiptText size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tighter">
                                إعدادات الفواتير
                            </h2>
                            <p className="text-[8px] md:text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                                تخصيص نظام الفوترة والترقيم والطباعة
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="px-3 py-2 text-[9px] md:text-[10px] font-bold text-gray-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                        >
                            إعادة ضبط
                        </button>
                        <button
                            onClick={handleSave}
                            className={cn(
                                "inline-flex items-center gap-2 px-5 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg",
                                saved
                                    ? "bg-emerald-600 text-white shadow-emerald-500/20"
                                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                            )}
                        >
                            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
                            {saved ? 'تم الحفظ ✓' : 'حفظ'}
                        </button>
                    </div>
                </div>

                {/* ═══════════════════════════ 1. ترقيم الفواتير ═══════════════════════════ */}
                <SettingSection icon={<Hash size={16} />} title="ترقيم الفواتير" subtitle="إعداد بادئات وتنسيق الأرقام" color="bg-blue-600 shadow-blue-500/20">
                    <div className="space-y-4">
                        {/* Preview */}
                        <div className="bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/20">
                            <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mb-1">معاينة رقم الفاتورة</p>
                            <p className="text-lg md:text-xl font-bold text-blue-800 dark:text-blue-200 font-mono tracking-wider">{previewNumber}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SettingField label="بادئة فاتورة البيع" value={invoice.invoice_prefix} onChange={v => handleUpdate({ invoice_prefix: v })} placeholder="INV-" dir="ltr" />
                            <SettingField label="رقم البداية" type="number" value={invoice.invoice_start_number} onChange={v => handleUpdate({ invoice_start_number: v })} />
                            <div>
                                <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">تنسيق اللاحقة</label>
                                <select
                                    value={invoice.invoice_suffix_format}
                                    onChange={e => handleUpdate({ invoice_suffix_format: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 dark:text-slate-200 outline-none transition-colors"
                                >
                                    <option value="YYYY-MM-XXXX">YYYY-MM-XXXX (سنة-شهر-رقم)</option>
                                    <option value="YYYY-XXXX">YYYY-XXXX (سنة-رقم)</option>
                                    <option value="XXXX">XXXX (رقم فقط)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SettingField label="بادئة عرض السعر" value={invoice.quote_prefix} onChange={v => handleUpdate({ quote_prefix: v })} placeholder="Q-" dir="ltr" />
                            <SettingField label="بادئة المرتجع" value={invoice.return_prefix} onChange={v => handleUpdate({ return_prefix: v })} placeholder="RET-" dir="ltr" />
                        </div>
                        <SettingToggle
                            checked={invoice.auto_generate_number}
                            onChange={v => handleUpdate({ auto_generate_number: v })}
                            label="توليد الأرقام تلقائياً"
                            description="النظام سيقوم بإنشاء رقم فاتورة تسلسلي عند كل فاتورة جديدة"
                        />
                    </div>
                </SettingSection>

                {/* ═══════════════════════════ 2. شروط الدفع ═══════════════════════════ */}
                <SettingSection icon={<CreditCard size={16} />} title="شروط الدفع" subtitle="إعدادات الاستحقاق والمهل الافتراضية" color="bg-emerald-600 shadow-emerald-500/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SettingField label="مهلة الدفع الافتراضية (أيام)" type="number" value={invoice.default_payment_terms} onChange={v => handleUpdate({ default_payment_terms: v })} />
                        <SettingField label="أيام الاستحقاق الافتراضية" type="number" value={invoice.default_due_date_days} onChange={v => handleUpdate({ default_due_date_days: v })} />
                    </div>
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                        <p className="text-[8px] md:text-[9px] font-bold text-amber-700 dark:text-amber-400">
                            ⏳ تاريخ الاستحقاق = تاريخ الفاتورة + مهلة الدفع. يمكن تعديله يدوياً لكل فاتورة.
                        </p>
                    </div>
                </SettingSection>

                {/* ═══════════════════════════ 3. تخصيص قالب الفاتورة ═══════════════════════════ */}
                <SettingSection icon={<Layout size={16} />} title="تخصيص قالب الفاتورة" subtitle="التحكم في شكل ومحتوى الفاتورة المطبوعة" color="bg-purple-600 shadow-purple-500/20">
                    <div className="space-y-5">
                        {/* Template Selection */}
                        <div>
                            <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">اختر نوع القالب</label>
                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    { id: 'simple', label: 'بسيط', desc: 'عرض أساسي بدون تفاصيل إضافية', icon: <FileText size={20} /> },
                                    { id: 'detailed', label: 'تفصيلي', desc: 'يشمل البيانات البنكية والخصم', icon: <Eye size={20} /> },
                                    { id: 'custom', label: 'مخصص', desc: 'تحكم كامل في كل العناصر', icon: <Settings2 size={20} /> },
                                ] as const).map(tmpl => (
                                    <button
                                        key={tmpl.id}
                                        type="button"
                                        onClick={() => handleUpdate({ invoice_template: tmpl.id })}
                                        className={cn(
                                            "p-3 md:p-4 rounded-xl border-2 text-center transition-all",
                                            invoice.invoice_template === tmpl.id
                                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10 shadow-md shadow-purple-500/10"
                                                : "border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-800"
                                        )}
                                    >
                                        <div className={cn(
                                            "mx-auto mb-2 w-10 h-10 rounded-lg flex items-center justify-center",
                                            invoice.invoice_template === tmpl.id
                                                ? "bg-purple-500 text-white"
                                                : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                                        )}>
                                            {tmpl.icon}
                                        </div>
                                        <p className={cn(
                                            "text-[10px] md:text-xs font-bold uppercase",
                                            invoice.invoice_template === tmpl.id ? "text-purple-700 dark:text-purple-300" : "text-gray-500"
                                        )}>{tmpl.label}</p>
                                        <p className="text-[7px] md:text-[8px] text-gray-400 mt-0.5 leading-tight">{tmpl.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Display Options */}
                        <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">عناصر العرض</p>
                            <div className="space-y-1 divide-y divide-gray-50 dark:divide-slate-800/50">
                                <SettingToggle checked={invoice.show_logo} onChange={v => handleUpdate({ show_logo: v })} label="عرض شعار الشركة" description="يظهر في ترويسة الفاتورة المطبوعة" />
                                <SettingToggle checked={invoice.show_bank_details} onChange={v => handleUpdate({ show_bank_details: v })} label="عرض البيانات البنكية" description="يعرض معلومات الحساب البنكي وال IBAN في التذييل" />
                            </div>
                        </div>

                        {/* Invoice Preview Mini */}
                        <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">معاينة مصغرة</p>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-4 text-[8px] md:text-[9px] space-y-2 font-mono max-w-sm">
                                {/* Mini invoice preview */}
                                {invoice.show_logo && (
                                    <div className="flex items-center gap-2 pb-2 border-b border-dashed border-gray-200 dark:border-slate-700">
                                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                                            <Image size={10} className="text-blue-500" />
                                        </div>
                                        <span className="font-bold text-gray-600 dark:text-slate-300">شعار الشركة</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-400">رقم الفاتورة:</span>
                                    <span className="font-bold text-gray-700 dark:text-slate-200">{previewNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">التاريخ:</span>
                                    <span className="font-bold text-gray-600 dark:text-slate-300">{new Date().toLocaleDateString('ar-SA')}</span>
                                </div>
                                <div className="border-t border-dashed border-gray-200 dark:border-slate-700 pt-2">
                                    <div className="flex justify-between mt-1">
                                        <span className="text-gray-600 dark:text-slate-300">قطعة غيار ×2</span>
                                        <span className="font-bold text-gray-700 dark:text-slate-200">500 ر.س</span>
                                    </div>
                                </div>
                                <div className="border-t-2 border-gray-300 dark:border-slate-600 pt-2 flex justify-between">
                                    <span className="font-bold text-gray-700 dark:text-slate-200">الإجمالي</span>
                                    <span className="font-bold text-blue-600">500 ر.س</span>
                                </div>
                                {invoice.show_bank_details && (
                                    <div className="border-t border-dashed border-gray-200 dark:border-slate-700 pt-2 text-gray-400">
                                        <span>IBAN: SA00 0000 0000 0000 0000</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </SettingSection>

                {/* ═══════════════════════════ 4. بيانات ترويسة الفاتورة ═══════════════════════════ */}
                <SettingSection icon={<Building size={16} />} title="بيانات ترويسة الفاتورة" subtitle="المعلومات التي تظهر في أعلى الفاتورة المطبوعة" color="bg-blue-600 shadow-blue-500/20">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SettingField label="اسم الشركة (بالعربية)" value={invoice.company_name_ar} onChange={v => handleUpdate({ company_name_ar: v })} placeholder="شركة الزهراء لقطع الغيار" />
                            <SettingField label="اسم الشركة (بالانجليزية)" value={invoice.company_name_en} onChange={v => handleUpdate({ company_name_en: v })} placeholder="Al Zahra Auto Parts" dir="ltr" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SettingField label="تخصص الشركة / النشاط" value={invoice.company_specialization} onChange={v => handleUpdate({ company_specialization: v })} placeholder="بيع قطع غيار السيارات وزيوت" />
                            <SettingField label="نص الترويسة الإضافي" value={invoice.invoice_header_text} onChange={v => handleUpdate({ invoice_header_text: v })} placeholder="فاتورة مبيعات" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SettingField label="رقم الهاتف" value={invoice.company_phone} onChange={v => handleUpdate({ company_phone: v })} placeholder="77XXXXXXX" dir="ltr" />
                            <SettingField label="البريد الإلكتروني" value={invoice.company_email} onChange={v => handleUpdate({ company_email: v })} placeholder="info@example.com" dir="ltr" />
                        </div>
                        <SettingField label="العنوان التفصيلي" value={invoice.company_address} onChange={v => handleUpdate({ company_address: v })} placeholder="صنعاء - شارع الستين" />
                    </div>
                </SettingSection>

                {/* ═══════════════════════════ 5. الملاحظات والشروط ═══════════════════════════ */}
                <SettingSection icon={<MessageSquare size={16} />} title="الملاحظات والشروط" subtitle="نصوص افتراضية تُضاف تلقائياً للفواتير" color="bg-amber-500 shadow-amber-500/20" defaultOpen={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">ملاحظات الفاتورة (عربي)</label>
                            <textarea
                                value={invoice.default_notes_ar}
                                onChange={e => handleUpdate({ default_notes_ar: e.target.value })}
                                rows={3}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 dark:text-slate-200 outline-none transition-colors resize-none"
                                placeholder="مثال: شكراً لتعاملكم معنا. البضاعة المباعة لا تُرد ولا تُستبدل."
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">ملاحظات الفاتورة (EN)</label>
                            <textarea
                                value={invoice.default_notes_en}
                                onChange={e => handleUpdate({ default_notes_en: e.target.value })}
                                rows={3}
                                dir="ltr"
                                className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 dark:text-slate-200 outline-none transition-colors resize-none"
                                placeholder="Thank you for your business."
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">الشروط والأحكام (عربي)</label>
                            <textarea
                                value={invoice.default_terms_ar}
                                onChange={e => handleUpdate({ default_terms_ar: e.target.value })}
                                rows={3}
                                className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 dark:text-slate-200 outline-none transition-colors resize-none"
                                placeholder="1. تم الاستلام بحالة ممتازة. 2. الضمان 30 يوماً..."
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">الشروط والأحكام (EN)</label>
                            <textarea
                                value={invoice.default_terms_en}
                                onChange={e => handleUpdate({ default_terms_en: e.target.value })}
                                rows={3}
                                dir="ltr"
                                className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 dark:text-slate-200 outline-none transition-colors resize-none"
                                placeholder="1. Terms & Conditions apply. 2. 30-day warranty..."
                            />
                        </div>
                    </div>
                </SettingSection>

                {/* Bottom Info */}
                <div className="p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20 flex items-start gap-3">
                    <div className="p-1.5 bg-indigo-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                        <Printer size={12} />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-1">تلميح</p>
                        <p className="text-[8px] md:text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed">
                            يمكنك معاينة القالب المختار عند طباعة أي فاتورة. الإعدادات هنا تنطبق على جميع الفواتير الجديدة كقيم افتراضية.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceSettings;
