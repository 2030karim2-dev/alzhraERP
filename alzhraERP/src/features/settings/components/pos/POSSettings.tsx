// POS Settings Component
import React from 'react';
import { Calculator, CreditCard, Printer, Monitor, Gift, Users, Wifi, WifiOff, Save } from 'lucide-react';
import { useSettingsStore } from '../../settingsStore';
import { useI18nStore } from '@/lib/i18nStore';
import { useFeedbackStore } from '../../../feedback/store';
import Card from '@/ui/base/Card';

export const POSSettings: React.FC = () => {
    const { dictionary: t } = useI18nStore();
    const { pos, setPOSSettings, resetSection } = useSettingsStore();

    const { showToast } = useFeedbackStore();

    const handleUpdate = (updates: Partial<typeof pos>) => {
        setPOSSettings(updates);
    };

    const handleSave = () => {
        showToast(t.settings_saved || 'تم حفظ الإعدادات بنجاح', 'success');
    };

    const handleReset = () => {
        if (window.confirm(t.confirm_reset || 'هل أنت متأكد من إعادة ضبط هذا القسم للافتراضي؟')) {
            resetSection('pos');
            showToast(t.reset_to_defaults || 'تمت إعادة الضبط بنجاح', 'info');
        }
    };

    return (
        <div className="space-y-4 p-2 md:p-3 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tighter">
                            {t.pos_settings || 'إعدادات نقطة البيع'}
                        </h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {t.pos_settings_desc || 'تخصيص نقطة البيع والفواتير السريعة'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="px-3 h-8 text-[10px] font-bold text-slate-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                    >
                        {t.reset_to_defaults || 'إعادة ضبط'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-5 h-8 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t.save || 'حفظ'}</span>
                    </button>
                </div>
            </div>

            {/* Payment Settings */}
            <Card className="p-4" isMicro>
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.payment_settings || 'إعدادات الدفع'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.default_payment_method || 'طريقة الدفع الافتراضية'}
                        </label>
                        <select
                            value={pos.default_payment_method}
                            onChange={(e) => handleUpdate({ default_payment_method: e.target.value as 'cash' | 'card' | 'mobile' })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        >
                            <option value="cash">{t.cash || 'نقدي'}</option>
                            <option value="card">{t.card || 'بطاقة'}</option>
                            <option value="mobile">{t.mobile_payment || 'دفع إلكتروني'}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.auto_print_receipt || 'طباعة الإيصال تلقائياً'}
                        </label>
                        <div className="flex items-center gap-4 mt-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="auto_print"
                                    checked={pos.auto_print_receipt === true}
                                    onChange={() => handleUpdate({ auto_print_receipt: true })}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-300">{t.yes || 'نعم'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="auto_print"
                                    checked={pos.auto_print_receipt === false}
                                    onChange={() => handleUpdate({ auto_print_receipt: false })}
                                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-300">{t.no || 'لا'}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Printer Settings */}
            <Card className="p-4" isMicro>
                <div className="flex items-center gap-2 mb-4">
                    <Printer className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.printer_settings || 'إعدادات الطابعة'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.default_printer || 'الطابعة الافتراضية'}
                        </label>
                        <select
                            value={pos.default_printer}
                            onChange={(e) => handleUpdate({ default_printer: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        >
                            <option value="thermal">{t.thermal_printer || 'طابعة حرارية'}</option>
                            <option value="a4">{t.a4_printer || 'طابعة A4'}</option>
                            <option value="pdf">{t.pdf_printer || 'PDF'}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.receipt_copies || 'عدد نسخ الإيصال'}
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={3}
                            value={pos.receipt_copies}
                            onChange={(e) => handleUpdate({ receipt_copies: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>
            </Card>

            {/* Display Settings */}
            <Card className="p-4" isMicro>
                <div className="flex items-center gap-2 mb-4">
                    <Monitor className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.display_settings || 'إعدادات العرض'}
                    </h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                    {t.show_customer_screen || 'شاشة العميل'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {t.show_customer_screen_desc || 'عرض تفاصيل الفاتورة للعميل'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={pos.show_customer_screen}
                                onChange={(e) => handleUpdate({ show_customer_screen: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Gift className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                    {t.gift_receipt_option || 'خيار إيصال الهدية'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {t.gift_receipt_option_desc || 'إمكانية طباعة إيصال بدون أسعار'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={pos.gift_receipt_option}
                                onChange={(e) => handleUpdate({ gift_receipt_option: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>
                </div>
            </Card>

            {/* Employee Discount */}
            <Card className="p-4" isMicro>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.employee_discount || 'خصم الموظف'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="employee_discount_enabled"
                            checked={pos.employee_discount_enabled}
                            onChange={(e) => handleUpdate({ employee_discount_enabled: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="employee_discount_enabled" className="text-sm text-slate-600 dark:text-slate-300">
                            {t.enable_employee_discount || 'تفعيل خصم الموظف'}
                        </label>
                    </div>
                    {pos.employee_discount_enabled && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                                {t.max_employee_discount || 'الحد الأقصى للخصم (%)'}
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={pos.max_employee_discount_percent}
                                onChange={(e) => handleUpdate({ max_employee_discount_percent: parseInt(e.target.value) || 0 })}
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    )}
                </div>
            </Card>

            {/* Offline Mode */}
            <Card className="p-4" isMicro>
                <div className="flex items-center gap-2 mb-4">
                    {pos.offline_mode_enabled ? (
                        <WifiOff className="w-5 h-5 text-amber-500" />
                    ) : (
                        <Wifi className="w-5 h-5 text-slate-400" />
                    )}
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.offline_mode || 'وضع عدم الاتصال'}
                    </h3>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="offline_mode_enabled"
                            checked={pos.offline_mode_enabled}
                            onChange={(e) => handleUpdate({ offline_mode_enabled: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="offline_mode_enabled" className="text-sm text-slate-600 dark:text-slate-300">
                            {t.enable_offline_mode || 'تفعيل العمل بدون اتصال'}
                        </label>
                    </div>
                    {pos.offline_mode_enabled && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                {t.offline_mode_warning || 'سيتم حفظ البيانات محلياً ومزامنتها عند استعادة الاتصال'}
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default POSSettings;
