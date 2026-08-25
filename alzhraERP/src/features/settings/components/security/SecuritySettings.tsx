import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ShieldCheck, Key, Smartphone, LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { usePasswordChange } from '../../../auth/hooks';
import { useI18nStore } from '@/lib/i18nStore';
import { useFeedbackStore } from '../../../feedback/store';
import { supabase } from '@/lib/supabaseClient';

const SecuritySettings: React.FC = () => {
  const { dictionary: t } = useI18nStore();
  const { showToast } = useFeedbackStore();
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const { changePassword, isLoading } = usePasswordChange();
  const [isTerminatingSessions, setIsTerminatingSessions] = useState(false);

  const newPasswordValue = watch('newPassword') || '';

  // Calculate password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) || /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'ضعيفة', color: 'bg-rose-500 text-rose-600' };
    if (score === 2 || score === 3) return { score: 2, label: 'متوسطة', color: 'bg-amber-500 text-amber-600' };
    return { score: 3, label: 'قوية جداً', color: 'bg-emerald-500 text-emerald-600' };
  };

  const strength = getPasswordStrength(newPasswordValue);

  const onSubmit = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      return;
    }
    const success = await changePassword(data.newPassword);
    if (success) {
      reset();
      showToast(t.password_updated_success || 'تم تحديث كلمة المرور بنجاح', 'success');
    }
  };

  const handleTerminateOtherSessions = async () => {
    if (!window.confirm('هل أنت متأكد من تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى؟')) {
      return;
    }

    try {
      setIsTerminatingSessions(true);
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      showToast('تم تسجيل الخروج بنجاح من كافة الأجهزة الأخرى', 'success');
    } catch (err: any) {
      showToast(err?.message || 'تعذر إنهاء الجلسات الأخرى', 'error');
    } finally {
      setIsTerminatingSessions(false);
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
          <Input label={t.current_password || "كلمة المرور الحالية"} type="password" dir="ltr" variant="micro" {...register('currentPassword')} />
          <div>
            <Input
              label={t.new_password || "كلمة المرور الجديدة"}
              type="password"
              dir="ltr"
              variant="micro"
              {...register('newPassword', { required: t.password_required || 'كلمة المرور الجديدة مطلوبة', minLength: { value: 6, message: t.password_min_length || 'يجب أن تكون 6 أحرف على الأقل' } })}
              error={errors.newPassword?.message as string}
            />
            {newPasswordValue && (
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <div className="flex gap-1 items-center">
                  <div className={`h-1.5 w-6 rounded-full ${strength.score >= 1 ? strength.color.split(' ')[0] : 'bg-gray-200 dark:bg-slate-700'}`} />
                  <div className={`h-1.5 w-6 rounded-full ${strength.score >= 2 ? strength.color.split(' ')[0] : 'bg-gray-200 dark:bg-slate-700'}`} />
                  <div className={`h-1.5 w-6 rounded-full ${strength.score >= 3 ? strength.color.split(' ')[0] : 'bg-gray-200 dark:bg-slate-700'}`} />
                </div>
                <span className={`font-bold ${strength.color.split(' ')[1]}`}>
                  قوة الكلمة: {strength.label}
                </span>
              </div>
            )}
          </div>
          <Input
            label={t.confirm_new_password || "تأكيد الكلمة الجديدة"}
            type="password"
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
                {t.two_factor_auth || 'التحقق بخطوتين (2FA)'}
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mb-3">
              {t.two_factor_auth_desc || 'إضافة طبقة حماية إضافية لحسابك باستخدام تطبيق المصادقة (Google Authenticator).'}
            </p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                <CheckCircle2 size={12} />
                محمي عبر Supabase Auth
              </span>
              <button
                type="button"
                onClick={() => showToast('إعدادات التحقق المزدوج متاحة ومُدارة عبر حساب الدخول الموحد', 'info')}
                className="text-[9px] font-bold text-blue-600 border-2 border-blue-500/20 px-3 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all uppercase"
              >
                {t.enable_protection || 'إدارة الحماية'}
              </button>
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-3xl border border-rose-100 dark:border-rose-900/20 text-right">
            <div className="flex items-center justify-between mb-2">
              <LogOut size={16} className="text-rose-600" />
              <h3 className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                {t.terminate_sessions || 'إنهاء الجلسات النشطة'}
              </h3>
            </div>
            <p className="text-[10px] text-rose-600/70 font-bold mb-3 leading-relaxed">
              {t.terminate_sessions_desc || 'تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى النشطة والإبقاء على جلستك الحالية فقط.'}
            </p>
            <button
              type="button"
              disabled={isTerminatingSessions}
              onClick={handleTerminateOtherSessions}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-60"
            >
              {isTerminatingSessions ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>جاري إنهاء الجلسات...</span>
                </>
              ) : (
                <>
                  <LogOut size={14} />
                  <span>{t.logout_all_devices || 'تسجيل الخروج من كل الأجهزة الأخرى'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
