import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Save,
  Building,
  Globe,
  Banknote,
  FileText,
  CheckCircle,
  Building2,
  Crown,
  Percent,
} from 'lucide-react';
import { useCompany, useCompanyMutation } from '../hooks';
import { useFeedbackStore } from '../../feedback/store';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';

const CompanyProfile: React.FC = () => {
  const { data: company, isLoading } = useCompany();
  const { mutate: updateProfile, isPending } = useCompanyMutation();
  const { showToast } = useFeedbackStore();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      english_name: '',
      base_currency: 'SAR',
      is_tax_enabled: false,
    },
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (company) {
      const comp = company as any;
      reset({
        name: comp.name || comp.name_ar || '',
        english_name: comp.english_name || comp.name_en || '',
        base_currency: comp.base_currency || 'SAR',
        is_tax_enabled: comp.is_tax_enabled ?? false,
      });
    }
  }, [company, reset]);

  const onSubmit = (data: any) => {
    // أعمدة قاعدة البيانات: name_ar, name_en, base_currency, is_tax_enabled
    const payload: Record<string, any> = {
      name_ar: data.name,
      name_en: data.english_name || null,
      base_currency: data.base_currency,
      is_tax_enabled: Boolean(data.is_tax_enabled),
    };

    updateProfile(payload, {
      onSuccess: () => {
        setSaved(true);
        showToast('تم حفظ بيانات المنشأة بنجاح ✓', 'success');
        setTimeout(() => {
          setSaved(false);
        }, 3000);
      },
      onError: (err: any) => {
        showToast(`فشل الحفظ: ${err?.message || 'خطأ غير معروف'}`, 'error');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-20 text-center max-md:p-6">
        <div className="border-3 inline-block h-8 w-8 animate-spin rounded-full border-blue-500 border-t-transparent" />
        <p className="mt-3 text-xs font-bold text-gray-400">جاري جلب بيانات المنشأة...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="animate-in fade-in p-3 duration-500 max-md:p-3 md:p-6"
    >
      <div className="mx-auto max-w-none space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 max-md:gap-3">
            <div className="rounded-xl bg-blue-600 p-2 text-white shadow-lg shadow-blue-500/20 max-md:p-2.5">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tighter text-gray-800 dark:text-slate-100 md:text-base">
                بيانات المنشأة
              </h2>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 md:text-[10px]">
                إدارة الهوية القانونية والمالية
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-5 py-2 text-[10px] font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 max-md:gap-2 md:px-6 md:py-2.5 md:text-xs',
              saved
                ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700'
                : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700',
              isPending && 'cursor-not-allowed opacity-50'
            )}
          >
            {isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : saved ? (
              <CheckCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            {saved ? 'تم الحفظ ✓' : 'حفظ التغييرات'}
          </button>
        </div>

        {/* Company Identity Card */}
        <div className="overflow-hidden rounded-2xl border-2 border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
          {/* Identity Section */}
          <div className="space-y-4 border-b border-gray-100 p-4 dark:border-slate-800 max-md:p-4 md:p-6">
            <div className="mb-2 flex items-center gap-2 max-md:gap-2">
              <span className="h-4 w-1 rounded-full bg-blue-600"></span>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 md:text-xs">
                هوية المنشأة
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              <Input
                label="اسم الشركة (بالعربية)"
                {...register('name')}
                icon={<Building size={16} />}
              />
              <Input
                label="اسم الشركة (بالانجليزية)"
                {...register('english_name')}
                dir="ltr"
                icon={<Globe size={16} />}
              />
            </div>
          </div>

          {/* Financial & Tax Section */}
          <div className="space-y-4 bg-gray-50/50 p-4 dark:bg-slate-900/50 max-md:p-4 md:p-6">
            <div className="mb-2 flex items-center gap-2 max-md:gap-2">
              <span className="h-4 w-1 rounded-full bg-emerald-500"></span>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 md:text-xs">
                المعلومات المالية
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              {/* Base Currency — العملات المتفق عليها فقط */}
              <div className="space-y-1.5">
                <label className="mr-1 flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 dark:text-slate-400 max-md:gap-1.5 md:text-[10px]">
                  <Banknote size={12} />
                  العملة الأساسية
                </label>
                <select
                  {...register('base_currency')}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-xs font-bold outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 md:py-3 md:text-sm"
                >
                  <option value="SAR">🇸🇦 SAR — ريال سعودي</option>
                  <option value="YER">🇾🇪 YER — ريال يمني</option>
                  <option value="OMR">🇴🇲 OMR — ريال عماني</option>
                  <option value="USD">🇺🇸 USD — دولار أمريكي</option>
                  <option value="CNY">🇨🇳 CNY — يوان صيني</option>
                </select>
                <div className="mt-1.5 flex items-center gap-2 max-md:gap-2">
                  <Crown size={10} className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 md:text-[10px]">
                    العملة الأساسية لقيد المعاملات
                  </span>
                </div>
              </div>

              {/* Tax System Toggle */}
              <div className="flex items-center justify-between rounded-xl border-2 border-gray-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 max-md:p-3 md:p-4">
                <div className="flex w-full items-center gap-3 space-y-1 max-md:gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 max-md:p-2">
                    <Percent size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-bold text-gray-800 dark:text-slate-200 md:text-xs">
                      تفعيل نظام الضرائب (VAT)
                    </h4>
                    <p className="mt-1 text-[10px] font-bold text-gray-500 dark:text-slate-400 md:text-[10px]">
                      إظهار خيارات وحقول الضرائب في واجهات الفواتير والمنتجات
                    </p>
                  </div>
                  <div>
                    <label className="relative inline-flex cursor-pointer flex-col items-center rounded-xl p-2 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 max-md:p-2">
                      <input
                        type="checkbox"
                        {...register('is_tax_enabled')}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[10px] after:top-[10px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-slate-700"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/20 dark:bg-blue-900/10 max-md:gap-3 max-md:p-3 md:p-4">
          <div className="mt-0.5 flex-shrink-0 rounded-lg bg-blue-500 p-1 text-white max-md:p-1.5">
            <FileText size={12} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-blue-800 dark:text-blue-300 md:text-[10px]">
              ملاحظة
            </p>
            <p className="text-[10px] font-bold leading-relaxed text-blue-600 dark:text-blue-400 md:text-[10px]">
              تغيير العملة الأساسية يؤثر على جميع التقارير المالية والقيود المحاسبية. تأكد من مراجعة
              أسعار الصرف بعد التغيير.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CompanyProfile;
