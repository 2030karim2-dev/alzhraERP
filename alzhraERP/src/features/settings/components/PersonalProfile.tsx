
import React, { useState } from 'react';
import { User, Mail, Shield, Save, CheckCircle, Camera } from 'lucide-react';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';
import { supabase } from '../../../lib/supabaseClient';

const PersonalProfile: React.FC = () => {
    const { user, login } = useAuthStore();
    const { showToast } = useFeedbackStore();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [isPending, setIsPending] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        try {
            const { data, error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            if (error) throw error;

            if (data.user) {
                // Update local store
                login({
                    ...user!,
                    full_name: fullName,
                });
                setSaved(true);
                showToast('تم تحديث البيانات الشخصية بنجاح', 'success');
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err: any) {
            showToast(err.message || 'فشل تحديث البيانات', 'error');
        } finally {
            setIsPending(false);
        }
    };

    const userInitial = fullName ? fullName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

    return (
        <div className="p-3 md:p-6 animate-in fade-in duration-500">
            <div className="max-w-none mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tighter">
                                الملف الشخصي
                            </h2>
                            <p className="text-[8px] md:text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                                إدارة بيانات الحساب الشخصية
                            </p>
                        </div>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 border-b border-gray-100 dark:border-slate-800">
                        {/* Avatar Section */}
                        <div className="relative group">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-3xl md:text-5xl font-black shadow-2xl shadow-indigo-500/30">
                                {userInitial}
                            </div>
                            <button className="absolute -bottom-2 -right-2 p-2.5 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-xl text-gray-400 hover:text-indigo-600 hover:scale-110 active:scale-90 transition-all shadow-lg">
                                <Camera size={18} />
                            </button>
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1 text-center md:text-right space-y-2">
                            <h3 className="text-xl font-black text-gray-800 dark:text-white">{fullName}</h3>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 dark:text-slate-400 font-bold text-sm">
                                <Mail size={14} />
                                {user?.email}
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
                                <Shield size={10} />
                                حساب نشط ومؤمن
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="الاسم الكامل"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                icon={<User size={16} />}
                                placeholder="ادخل اسمك الكامل"
                                required
                            />
                            <Input
                                label="البريد الإلكتروني"
                                value={user?.email || ''}
                                readOnly
                                disabled
                                icon={<Mail size={16} />}
                                className="bg-gray-50 dark:bg-slate-800/50 cursor-not-allowed"
                            />
                        </div>

                        <div className="flex justify-start">
                            <button
                                type="submit"
                                disabled={isPending || fullName === user?.full_name}
                                className={cn(
                                    "inline-flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl",
                                    saved
                                        ? "bg-emerald-600 text-white shadow-emerald-500/20"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25",
                                    (isPending || fullName === user?.full_name) && !saved && "opacity-50 cursor-not-allowed grayscale"
                                )}
                            >
                                {isPending ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-amber-500 shadow-sm">
                            <Shield size={24} />
                        </div>
                        <div className="text-right">
                            <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">الأمان وكلمة المرور</h4>
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-1">تأكد من استخدام كلمة مرور قوية وتغييرها دورياً</p>
                        </div>
                    </div>
                    <button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-lg transition-all shadow-lg shadow-amber-500/20">
                        تغيير كلمة المرور
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonalProfile;
