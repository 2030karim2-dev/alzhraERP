import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Key, Smartphone, LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';
import { usePasswordChange, useTerminateSessions } from '../../../auth/hooks';
import { useI18nStore } from '@/lib/i18nStore';
import { useFeedbackStore } from '../../../feedback/store';

interface SecurityFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SecuritySettings: React.FC = () => {
  const { dictionary: t } = useI18nStore();
  const { showToast } = useFeedbackStore();
  // المخطط داخل المكوّن حتى تأتي رسائل التحقق من القاموس النشط (i18n).
  const securitySchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z
            .string()
            .min(1, t.current_password_required || 'كلمة المرور الحالية مطلوبة'),
          newPassword: z
            .string()
            .min(8, t.password_min_8 || 'يجب أن تكون كلمة المرور 8 أحرف على الأقل'),
          confirmPassword: z
            .string()
            .min(1, t.confirm_password_required || 'تأكيد كلمة المرور مطلوب'),
        })
        .refine(data => data.newPassword === data.confirmPassword, {
          message: t.passwords_not_match || 'كلمتا المرور غير متطابقتين',
          path: ['confirmPassword'],
        }),
    [t]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { changePassword, isLoading, error: changeError } = usePasswordChange();
  const {
    terminateOthers,
    isLoading: isTerminatingSessions,
    error: terminateError,
  } = useTerminateSessions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const newPasswordValue = watch('newPassword') || '';

  // Calculate password strength (same scoring rules, i18n-backed labels)
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) || /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1)
      return { score: 1, label: t.password_weak || 'ضعيفة', color: 'bg-rose-500 text-rose-600' };
    if (score === 2 || score === 3)
      return {
        score: 2,
        label: t.password_medium || 'متوسطة',
        color: 'bg-amber-500 text-amber-600',
      };
    return {
      score: 3,
      label: t.password_strong || 'قوية جداً',
      color: 'bg-emerald-500 text-emerald-600',
    };
  };

  const strength = getPasswordStrength(newPasswordValue);

  const onSubmit = async (values: SecurityFormValues) => {
    const success = await changePassword(values.newPassword);
    if (success) {
      reset();
      showToast(t.password_updated_success || 'تم تحديث كلمة المرور بنجاح', 'success');
    }
  };

  const handleConfirmTerminate = async () => {
    const ok = await terminateOthers();
    setIsConfirmOpen(false);
    if (ok) {
      showToast(
        t.sessions_terminated_success || 'تم تسجيل الخروج بنجاح من كافة الأجهزة الأخرى',
        'success'
      );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 mx-auto max-w-4xl space-y-4 p-3 duration-500 md:p-4">
      <div className="text-right">
        <h2 className="flex items-center justify-end gap-3 text-sm font-bold text-gray-800 dark:text-slate-100">
          {t.security_privacy || 'الأمان والخصوصية'}
          <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800">
            <ShieldCheck size={20} />
          </div>
        </h2>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {t.security_privacy_desc || 'تأمين حسابك وإدارة صلاحيات الوصول'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Change Password */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-3xl border border-gray-100 bg-[var(--app-surface)] p-4 text-right shadow-sm dark:border-slate-800"
        >
          <div className="mb-2 flex items-center justify-end gap-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {t.change_password || 'تغيير كلمة المرور'}
            </h3>
            <Key size={14} className="text-blue-500" />
          </div>
          <Input
            label={t.current_password || 'كلمة المرور الحالية'}
            type="password"
            dir="ltr"
            variant="micro"
            {...register('currentPassword')}
          />
          <div>
            <Input
              label={t.new_password || 'كلمة المرور الجديدة'}
              type="password"
              dir="ltr"
              variant="micro"
              {...register('newPassword')}
              error={errors.newPassword?.message}
            />
            {newPasswordValue && (
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <div
                    className={`h-1.5 w-6 rounded-full ${strength.score >= 1 ? strength.color.split(' ')[0] : 'bg-gray-200 dark:bg-slate-700'}`}
                  />
                  <div
                    className={`h-1.5 w-6 rounded-full ${strength.score >= 2 ? strength.color.split(' ')[0] : 'bg-gray-200 dark:bg-slate-700'}`}
                  />
                  <div
                    className={`h-1.5 w-6 rounded-full ${strength.score >= 3 ? strength.color.split(' ')[0] : 'bg-gray-200 dark:bg-slate-700'}`}
                  />
                </div>
                <span className={`font-bold ${strength.color.split(' ')[1]}`}>
                  {t.password_strength_label || 'قوة الكلمة'}: {strength.label}
                </span>
              </div>
            )}
          </div>
          <Input
            label={t.confirm_new_password || 'تأكيد الكلمة الجديدة'}
            type="password"
            dir="ltr"
            variant="micro"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          {changeError != null && (
            <p className="text-[10px] font-bold text-rose-600" role="alert">
              {changeError}
            </p>
          )}
          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full rounded-xl py-2 text-[11px] font-bold"
          >
            {t.update_password || 'تحديث كلمة السر'}
          </Button>
        </form>

        {/* 2FA & Sessions */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-[var(--app-surface)] p-4 text-right shadow-sm dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/20">
                <Smartphone size={18} />
              </div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-800 dark:text-slate-100">
                {t.two_factor_auth || 'التحقق بخطوتين (2FA)'}
              </h3>
            </div>
            <p className="mb-3 text-[10px] font-bold text-gray-400">
              {t.two_factor_auth_desc ||
                'إضافة طبقة حماية إضافية لحسابك باستخدام تطبيق المصادقة (Google Authenticator).'}
            </p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/20">
                <CheckCircle2 size={12} />
                محمي عبر Supabase Auth
              </span>
              <button
                type="button"
                onClick={() => {
                  showToast('إعدادات التحقق المزدوج متاحة ومُدارة عبر حساب الدخول الموحد', 'info');
                }}
                className="rounded-xl border-2 border-blue-500/20 px-3 py-1.5 text-[10px] font-bold uppercase text-blue-600 transition-all hover:bg-blue-50 dark:hover:bg-slate-800"
              >
                {t.enable_protection || 'إدارة الحماية'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-right dark:border-rose-900/20 dark:bg-rose-900/10">
            <div className="mb-2 flex items-center justify-between">
              <LogOut size={16} className="text-rose-600" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-rose-800 dark:text-rose-400">
                {t.terminate_sessions || 'إنهاء الجلسات النشطة'}
              </h3>
            </div>
            <p className="mb-3 text-[10px] font-bold leading-relaxed text-rose-600/70">
              {t.terminate_sessions_desc ||
                'تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى النشطة والإبقاء على جلستك الحالية فقط.'}
            </p>
            <button
              type="button"
              disabled={isTerminatingSessions}
              onClick={() => {
                setIsConfirmOpen(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-[10px] font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-700 active:scale-95 disabled:opacity-60"
            >
              {isTerminatingSessions ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t.terminating_sessions || 'جاري إنهاء الجلسات...'}</span>
                </>
              ) : (
                <>
                  <LogOut size={14} />
                  <span>{t.logout_all_devices || 'تسجيل الخروج من كل الأجهزة الأخرى'}</span>
                </>
              )}
            </button>
            {terminateError != null && (
              <p className="mt-2 text-[10px] font-bold text-rose-600" role="alert">
                {terminateError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* تأكيد إنهاء الجلسات — عبر نظام النوافذ الموحد بدل window.confirm */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isTerminatingSessions) setIsConfirmOpen(false);
        }}
        onConfirm={() => {
          void handleConfirmTerminate();
        }}
        title={t.terminate_sessions_confirm_title || 'إنهاء الجلسات الأخرى؟'}
        message={
          t.terminate_sessions_confirm_desc ||
          'سيتم تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى المسجلة، وستبقى جلستك الحالية نشطة.'
        }
        confirmLabel={t.confirm_terminate_sessions || 'نعم، أنهِ الجلسات'}
        cancelLabel={t.cancel || 'إلغاء'}
        variant="danger"
        isLoading={isTerminatingSessions}
      />
    </div>
  );
};

export default SecuritySettings;
