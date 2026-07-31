
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Building, Globe, Banknote, FileText, CheckCircle, Building2, Crown, Percent } from 'lucide-react';
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
    }
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
        setTimeout(() => setSaved(false), 3000);
      },
      onError: (err: any) => {
        showToast(`فشل الحفظ: ${err?.message || 'خطأ غير معروف'}`, 'error');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-20 text-center">
        <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 mt-3">جاري جلب بيانات المنشأة...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-3 md:p-6 animate-in fade-in duration-500">
      <div className="max-w-none mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tighter">
                بيانات المنشأة
              </h2>
              <p className="text-[8px] md:text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                إدارة الهوية القانونية والمالية
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 px-5 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg",
              saved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <CheckCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            {saved ? 'تم الحفظ ✓' : 'حفظ التغييرات'}
          </button>
        </div>

        {/* Company Identity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Identity Section */}
          <div className="p-4 md:p-6 space-y-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
              <h3 className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                هوية المنشأة
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="اسم الشركة (بالعربية)"
                placeholder="شركة الزهراء لقطع الغيار"
                {...register('name')}
                icon={<Building size={16} />}
              />
              <Input
                label="اسم الشركة (بالانجليزية)"
                placeholder="Al Zahra Auto Parts"
                {...register('english_name')}
                dir="ltr"
                icon={<Globe size={16} />}
              />
            </div>
          </div>

          {/* Financial & Tax Section */}
          <div className="p-4 md:p-6 space-y-4 bg-gray-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
              <h3 className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                المعلومات المالية
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Base Currency — العملات المتفق عليها فقط */}
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mr-1 flex items-center gap-1.5">
                  <Banknote size={12} />
                  العملة الأساسية
                </label>
                <select
                  {...register('base_currency')}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2.5 md:py-3 px-3 text-xs md:text-sm font-bold outline-none dark:text-slate-200 transition-colors"
                >
                  <option value="SAR">🇸🇦 SAR — ريال سعودي</option>
                  <option value="YER">🇾🇪 YER — ريال يمني</option>
                  <option value="OMR">🇴🇲 OMR — ريال عماني</option>
                  <option value="USD">🇺🇸 USD — دولار أمريكي</option>
                  <option value="CNY">🇨🇳 CNY — يوان صيني</option>
                </select>
                <div className="flex items-center gap-2 mt-1.5">
                  <Crown size={10} className="text-amber-500" />
                  <span className="text-[8px] md:text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                    العملة الأساسية لقيد المعاملات
                  </span>
                </div>
              </div>

              {/* Tax System Toggle */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-xl">
                <div className="space-y-1 w-full flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Percent size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] md:text-xs font-bold text-gray-800 dark:text-slate-200">
                      تفعيل نظام الضرائب (VAT)
                    </h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-gray-500 dark:text-slate-400 mt-1">
                      إظهار خيارات وحقول الضرائب في واجهات الفواتير والمنتجات
                    </p>
                  </div>
                  <div>
                    <label className="relative inline-flex flex-col items-center cursor-pointer p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <input type="checkbox" {...register('is_tax_enabled')} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[10px] after:left-[10px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20 flex items-start gap-3">
          <div className="p-1.5 bg-blue-500 text-white rounded-lg flex-shrink-0 mt-0.5">
            <FileText size={12} />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">ملاحظة</p>
            <p className="text-[8px] md:text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-relaxed">
              تغيير العملة الأساسية يؤثر على جميع التقارير المالية والقيود المحاسبية. تأكد من مراجعة أسعار الصرف بعد التغيير.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CompanyProfile;
