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
    <div className="animate-in fade-in space-y-4 p-2 duration-500 md:p-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <Package className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-tighter text-slate-800 dark:text-white">
              {t.inventory_settings || 'إعدادات المخزون'}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t.inventory_settings_desc || 'تخصيص إعدادات المخزون والتنبيهات'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-rose-600"
          >
            {t.reset_to_defaults || 'إعادة ضبط'}
          </button>
          <button
            onClick={handleSave}
            className="flex h-8 items-center gap-2 rounded-lg bg-purple-600 px-5 text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {t.save || 'حفظ'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Cost Method */}
        <Card className="p-4" isMicro>
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-800 dark:text-white">
              {t.cost_method || 'طريقة احتساب التكلفة'}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'fifo', label: 'FIFO', desc: t.fifo_desc || 'الأولى دخولاً الأولى خروجاً' },
              { id: 'lifo', label: 'LIFO', desc: t.lifo_desc || 'الأخيرة دخولاً الأولى خروجاً' },
              {
                id: 'average',
                label: t.average || 'المتوسط',
                desc: t.average_desc || 'متوسط التكلفة المرجح',
              },
            ].map(method => (
              <label
                key={method.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-all ${
                  inventory.cost_method === method.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-slate-100 hover:border-purple-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="cost_method"
                  value={method.id}
                  checked={inventory.cost_method === method.id}
                  onChange={e => {
                    handleUpdate({ cost_method: e.target.value as 'fifo' | 'lifo' | 'average' });
                  }}
                  className="mt-0.5 h-3.5 w-3.5 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-800 dark:text-white">
                    {method.label}
                  </span>
                  <p className="mt-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-slate-500">
                    {method.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          {/* Low Stock Alert */}
          <Card className="p-4" isMicro>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-400" />
              <h3 className="text-sm font-bold uppercase tracking-tight text-slate-800 dark:text-white">
                {t.low_stock_alert || 'تنبيه المخزون المنخفض'}
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t.default_low_stock_threshold || 'حد التنبيه الافتراضي'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={inventory.default_low_stock_threshold}
                  onChange={e => {
                    handleUpdate({ default_low_stock_threshold: parseInt(e.target.value) || 5 });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <label
                  htmlFor="enable_low_stock_alert"
                  className="text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  {t.enable_low_stock_alert || 'تفعيل تنبيه المخزون'}
                </label>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    id="enable_low_stock_alert"
                    type="checkbox"
                    checked={inventory.enable_low_stock_alert}
                    onChange={e => {
                      handleUpdate({ enable_low_stock_alert: e.target.checked });
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-slate-600 dark:bg-slate-700"></div>
                </label>
              </div>
            </div>
          </Card>

          {/* Auto Alerts */}
          <Card className="p-4" isMicro>
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-400" />
              <h3 className="text-sm font-bold uppercase tracking-tight text-slate-800 dark:text-white">
                {t.auto_alerts || 'التنبيهات التلقائية'}
              </h3>
            </div>
            <div className="space-y-2">
              {[
                {
                  id: 'auto_alert_on_low_stock',
                  label: t.auto_alert_on_low_stock || 'تنبيه انخفاض المخزون',
                  checked: inventory.auto_alert_on_low_stock,
                },
                {
                  id: 'auto_alert_on_expiry',
                  label: t.auto_alert_on_expiry || 'تنبيه انتهاء الصلاحية',
                  checked: inventory.auto_alert_on_expiry,
                },
                {
                  id: 'auto_reorder_enabled',
                  label: t.auto_reorder_enabled || 'إعادة الطلب التلقائية',
                  checked: inventory.auto_reorder_enabled,
                },
              ].map(alert => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50"
                >
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {alert.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={alert.checked}
                    onChange={e => {
                      handleUpdate({ [alert.id]: e.target.checked });
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Tracking Settings */}
      <Card className="p-4" isMicro>
        <div className="mb-4 flex items-center gap-2">
          <Barcode className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-bold uppercase tracking-tight text-slate-800 dark:text-white">
            {t.tracking_settings || 'إعدادات التتبع'}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Barcode className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[11px] font-bold uppercase leading-none text-slate-800 dark:text-white">
                  {t.track_serial_numbers || 'تتبع الأرقام التسلسلية'}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t.track_serial_numbers_desc || 'تتبع كل منتج برقمه التسلسلي'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={inventory.track_serial_numbers}
                onChange={e => {
                  handleUpdate({ track_serial_numbers: e.target.checked });
                }}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full dark:bg-slate-700"></div>
            </label>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-[11px] font-bold uppercase leading-none text-slate-800 dark:text-white">
                  {t.track_expiry_dates || 'تتبع تواريخ الانتهاء'}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t.track_expiry_dates_desc || 'تتبع الفعالية والصلاحية'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={inventory.track_expiry_dates}
                onChange={e => {
                  handleUpdate({ track_expiry_dates: e.target.checked });
                }}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full dark:bg-slate-700"></div>
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InventorySettings;
