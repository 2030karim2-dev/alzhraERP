
import React from 'react';
import { useForm } from 'react-hook-form';
import { ShieldCheck, Key, Smartphone, LogOut } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { usePasswordChange } from '../../../auth/hooks';
import { useI18nStore } from '@/lib/i18nStore';
import { useFeedbackStore } from '../../../feedback/store';

const SecuritySettings: React.FC = () => {
  const { dictionary: t } = useI18nStore();
  const { showToast } = useFeedbackStore();
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const { changePassword, isLoading } = usePasswordChange();

  const onSubmit = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      // This is now handled by form validation, but kept as a safeguard
      return;
    }
    const success = await changePassword(data.newPassword);
    if (success) {
      reset();
    }
  };

  return (
    <div className="p-3 md:p-4 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto space-y-4">
      <div className="text-right">
        <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-3 justify-end">
          {t.security_privacy || 'الأمان والخصوصية'}
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl">
            <ShieldCheck size={20} />
          </div>
        </h2>
        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
          {t.security_privacy_desc || 'تأمين حسابك وإدارة صلاحيات الوصول'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Change Password */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 text-right">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t.change_password || 'تغيير كلمة المرور'}
            </h3>
            <Key size={14} className="text-blue-500" />
          </div>
          <Input label={t.current_password || "كلمة المرور الحالية"} type="password" placeholder="••••••••" dir="ltr" variant="micro" {...register('currentPassword')} />
          <Input
            label={t.new_password || "كلمة المرور الجديدة"}
            type="password"
            placeholder="••••••••"
            dir="ltr"
            variant="micro"
            {...register('newPassword', { required: t.password_required || 'كلمة المرور الجديدة مطلوبة', minLength: { value: 6, message: t.password_min_length || 'يجب أن تكون 6 أحرف على الأقل' } })}
            error={errors.newPassword?.message as string}
          />
          <Input
            label={t.confirm_new_password || "تأكيد الكلمة الجديدة"}
            type="password"
            placeholder="••••••••"
            dir="ltr"
            variant="micro"
            {...register('confirmPassword', { required: t.confirm_password_required || 'تأكيد كلمة المرور مطلوب', validate: value => value === watch('newPassword') || (t.passwords_not_match || 'كلمتا المرور غير متطابقتين') })}
            error={errors.confirmPassword?.message as string}
          />
          <Button type="submit" isLoading={isLoading} className="w-full rounded-xl py-2 text-[11px] font-bold">
            {t.update_password || 'تحديث كلمة السر'}
          </Button>
        </form>

        {/* 2FA & Sessions */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm text-right">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                <Smartphone size={18} />
              </div>
              <h3 className="text-[11px] font-bold text-gray-800 dark:text-slate-100 uppercase tracking-widest">
                {t.two_factor_auth || 'التحقق بخطوتين'}
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mb-3">
              {t.two_factor_auth_desc || 'إضافة طبقة حماية إضافية لحسابك باستخدام تطبيق المصادقة.'}
            </p>
            <button
              onClick={() => showToast(t.feature_coming_soon || 'ستتوفر قريباً', 'info')}
              className="text-[9px] font-bold text-blue-600 border-2 border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all uppercase"
            >
              {t.enable_protection || 'تفعيل الحماية'}
            </button>
          </div>

          <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-3xl border border-rose-100 dark:border-rose-900/20 text-right">
            <div className="flex items-center justify-between mb-2">
              <LogOut size={16} className="text-rose-600" />
              <h3 className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                {t.terminate_sessions || 'إنهاء الجلسات'}
              </h3>
            </div>
            <p className="text-[10px] text-rose-600/70 font-bold mb-3 leading-relaxed">
              {t.terminate_sessions_desc || 'تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى النشطة.'}
            </p>
            <button
              onClick={() => showToast(t.feature_coming_soon || 'ستتوفر قريباً', 'info')}
              className="w-full bg-rose-600 text-white py-2.5 rounded-xl text-[9px] font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
            >
              {t.logout_all_devices || 'تسجيل الخروج من كل الأجهزة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
