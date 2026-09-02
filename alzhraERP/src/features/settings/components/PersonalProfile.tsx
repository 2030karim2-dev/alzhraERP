import React, { useState } from 'react';
import { User, Mail, Shield, Save, CheckCircle, Camera } from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';
import { useUpdateProfile } from '../hooks/useProfileUpdate';

const PersonalProfile: React.FC = () => {
  const { user, login } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saved, setSaved] = useState(false);
  const updateProfile = useUpdateProfile();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({ full_name: fullName });
      login({ ...user!, full_name: fullName });
      setSaved(true);
      showToast('تم تحديث البيانات الشخصية بنجاح', 'success');
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث البيانات', 'error');
    }
  };

  const userInitial = fullName
    ? fullName.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : 'U';

  return (
    <div className="animate-in fade-in p-3 duration-500 max-md:p-3 md:p-6">
      <div className="mx-auto max-w-none space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 max-md:gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-500/20 max-md:p-2.5">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tighter text-gray-800 dark:text-slate-100 md:text-base">
                الملف الشخصي
              </h2>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 md:text-[10px]">
                إدارة بيانات الحساب الشخصية
              </p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl border-2 border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
          <div className="flex flex-col items-center gap-8 border-b border-gray-100 p-6 dark:border-slate-800 max-md:gap-3 max-md:p-3 md:flex-row md:p-8">
            {/* Avatar Section */}
            <div className="group relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-slate-800 text-2xl font-bold text-white dark:bg-slate-700 md:h-24 md:w-24 md:text-3xl">
                {userInitial}
              </div>
              <button
                className="absolute -bottom-2 -right-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text-secondary)] shadow-xs transition-colors duration-150 hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]"
                title="تغيير الصورة"
              >
                <Camera size={16} />
              </button>
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-2 text-center md:text-right">
              <h3 className="text-xl font-black text-gray-800 dark:text-white">{fullName}</h3>
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-500 dark:text-slate-400 max-md:gap-2 md:justify-start">
                <Mail size={14} />
                {user?.email}
              </div>
              <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 dark:bg-emerald-500/10 max-md:gap-2 md:mx-0 md:justify-start">
                <Shield size={10} />
                حساب نشط ومؤمن
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6 p-6 max-md:p-3 md:p-8">
            <div className="grid grid-cols-1 gap-6 max-md:gap-3 md:grid-cols-2">
              <Input
                label="الاسم الكامل"
                value={fullName}
                onChange={e => {
                  setFullName(e.target.value);
                }}
                icon={<User size={16} />}
                required
              />
              <Input
                label="البريد الإلكتروني"
                value={user?.email || ''}
                readOnly
                disabled
                icon={<Mail size={16} />}
                className="cursor-not-allowed bg-gray-50 dark:bg-slate-800/50"
              />
            </div>

            <div className="flex justify-start">
              <button
                type="submit"
                disabled={updateProfile.isPending || fullName === user?.full_name}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-8 py-3 text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 max-md:gap-2',
                  saved
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-indigo-600 text-white shadow-indigo-500/25 hover:bg-indigo-700',
                  (updateProfile.isPending || fullName === user?.full_name) &&
                    !saved &&
                    'cursor-not-allowed opacity-50 grayscale'
                )}
              >
                {updateProfile.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : saved ? (
                  <CheckCircle size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saved ? 'تم التحديث بنجاح' : 'تحديث البيانات الشخصية'}
              </button>
            </div>
          </form>
        </div>

        {/* Security Section Shortcut */}
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-amber-100 bg-amber-50 p-6 dark:border-amber-900/20 dark:bg-amber-900/10 max-md:gap-3 max-md:p-3 md:flex-row">
          <div className="flex items-center gap-4 max-md:gap-4">
            <div className="rounded-xl bg-[var(--app-surface)] p-3 text-amber-500 shadow-sm max-md:p-3">
              <Shield size={24} />
            </div>
            <div className="text-right">
              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                الأمان وكلمة المرور
              </h4>
              <p className="mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                تأكد من استخدام كلمة مرور قوية وتغييرها دورياً
              </p>
            </div>
          </div>
          <button className="rounded-lg bg-amber-500 px-6 py-2.5 text-[10px] font-black text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600">
            تغيير كلمة المرور
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;
