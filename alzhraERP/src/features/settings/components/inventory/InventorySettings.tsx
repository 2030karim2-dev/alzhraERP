// Inventory Settings Component
import React from 'react';
import { Package, AlertTriangle, Barcode, Calendar, Bell, Save } from 'lucide-react';
import { useSettingsStore } from '../../settingsStore';
import { useI18nStore } from '@/lib/i18nStore';
import { useFeedbackStore } from '../../../feedback/store';
import Card from '@/ui/base/Card';

export const InventorySettings: React.FC = () => {
    const { dictionary: t } = useI18nStore();
    const { inventory, setInventorySettings, resetSection } = useSettingsStore();
    const { showToast } = useFeedbackStore();

    const handleUpdate = (updates: Partial<typeof inventory>) => {
        setInventorySettings(updates);
    };

    const handleSave = () => {
        showToast(t.settings_saved || 'تم حفظ الإعدادات بنجاح', 'success');
    };

    const handleReset = () => {
        if (window.confirm(t.confirm_reset || 'هل أنت متأكد من إعادة ضبط هذا القسم للافتراضي؟')) {
            resetSection('inventory');
            showToast(t.reset_to_defaults || 'تمت إعادة الضبط بنجاح', 'info');
        }
    };

    return (
        <div className="space-y-4 p-2 md:p-3 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tighter">
                            {t.inventory_settings || 'إعدادات المخزون'}
                        </h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {t.inventory_settings_desc || 'تخصيص إعدادات المخزون والتنبيهات'}
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
                        className="flex items-center gap-2 px-5 h-8 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t.save || 'حفظ'}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost Method */}
                <Card className="p-4" isMicro>
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                            {t.cost_method || 'طريقة احتساب التكلفة'}
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { id: 'fifo', label: 'FIFO', desc: t.fifo_desc || 'الأولى دخولاً الأولى خروجاً' },
                            { id: 'lifo', label: 'LIFO', desc: t.lifo_desc || 'الأخيرة دخولاً الأولى خروجاً' },
                            { id: 'average', label: t.average || 'المتوسط', desc: t.average_desc || 'متوسط التكلفة المرجح' },
                        ].map((method) => (
                            <label
                                key={method.id}
                                className={`flex items-start gap-3 p-2.5 border rounded-xl cursor-pointer transition-all ${inventory.cost_method === method.id
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-purple-200'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="cost_method"
                                    value={method.id}
                                    checked={inventory.cost_method === method.id}
                                    onChange={(e) => handleUpdate({ cost_method: e.target.value as 'fifo' | 'lifo' | 'average' })}
                                    className="mt-0.5 w-3.5 h-3.5 text-purple-600 focus:ring-purple-500"
                                />
                                <div>
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase">{method.label}</span>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-none mt-0.5">{method.desc}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </Card>

                <div className="space-y-4">
                    {/* Low Stock Alert */}
                    <Card className="p-4" isMicro>
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-slate-400" />
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                                {t.low_stock_alert || 'تنبيه المخزون المنخفض'}
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                    {t.default_low_stock_threshold || 'حد التنبيه الافتراضي'}
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={inventory.default_low_stock_threshold}
                                    onChange={(e) => handleUpdate({ default_low_stock_threshold: parseInt(e.target.value) || 5 })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <label htmlFor="enable_low_stock_alert" className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {t.enable_low_stock_alert || 'تفعيل تنبيه المخزون'}
                                </label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        id="enable_low_stock_alert"
                                        type="checkbox"
                                        checked={inventory.enable_low_stock_alert}
                                        onChange={(e) => handleUpdate({ enable_low_stock_alert: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                        </div>
                    </Card>

                    {/* Auto Alerts */}
                    <Card className="p-4" isMicro>
                        <div className="flex items-center gap-2 mb-4">
                            <Bell className="w-5 h-5 text-slate-400" />
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                                {t.auto_alerts || 'التنبيهات التلقائية'}
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {[
                                { id: 'auto_alert_on_low_stock', label: t.auto_alert_on_low_stock || 'تنبيه انخفاض المخزون', checked: inventory.auto_alert_on_low_stock },
                                { id: 'auto_alert_on_expiry', label: t.auto_alert_on_expiry || 'تنبيه انتهاء الصلاحية', checked: inventory.auto_alert_on_expiry },
                                { id: 'auto_reorder_enabled', label: t.auto_reorder_enabled || 'إعادة الطلب التلقائية', checked: inventory.auto_reorder_enabled },
                            ].map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{alert.label}</span>
                                    <input
                                        type="checkbox"
                                        checked={alert.checked}
                                        onChange={(e) => handleUpdate({ [alert.id]: e.target.checked })}
                                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Tracking Settings */}
            <Card className="p-4" isMicro>
                <div className="flex items-center gap-2 mb-4">
                    <Barcode className="w-5 h-5 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                        {t.tracking_settings || 'إعدادات التتبع'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Barcode className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase leading-none">
                                    {t.track_serial_numbers || 'تتبع الأرقام التسلسلية'}
                                </p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                                    {t.track_serial_numbers_desc || 'تتبع كل منتج برقمه التسلسلي'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={inventory.track_serial_numbers}
                                onChange={(e) => handleUpdate({ track_serial_numbers: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase leading-none">
                                    {t.track_expiry_dates || 'تتبع تواريخ الانتهاء'}
                                </p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                                    {t.track_expiry_dates_desc || 'تتبع الفعالية والصلاحية'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={inventory.track_expiry_dates}
                                onChange={(e) => handleUpdate({ track_expiry_dates: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                        </label>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default InventorySettings;
