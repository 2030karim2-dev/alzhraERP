import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building, Mail, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useRegister, useGoogleLogin } from '../hooks';
import { FloatingInput } from './FloatingInput';

export const RegisterForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [formData, setFormData] = useState({ fullName: '', companyName: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const { register, isLoading, error, isSuccess } = useRegister();
    const { login: loginWithGoogle, isLoading: isGoogleLoading, error: googleError } = useGoogleLogin();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        register(formData.email, formData.password, formData.companyName, formData.fullName);
    };

    if (isSuccess) {
        return (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/10">
                    <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">تم التسجيل بنجاح!</h3>
                <p className="text-gray-500 dark:text-slate-400 font-medium mb-8">لقد أرسلنا رابط تفعيل إلى <br /><span className="text-blue-600 font-mono font-bold text-xs">{formData.email}</span></p>
                <button onClick={onSuccess} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all active:scale-95">استمر لتسجيل الدخول</button>
            </motion.div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">ابدأ الآن 🚀</h2>
                <p className="text-sm text-gray-500 font-medium">خطوات بسيطة وسيكون نظامك جاهزاً</p>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/50 flex gap-2">
                        <span>⚠️</span> {error}
                    </motion.div>
                )}
                {googleError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/50 flex gap-2">
                        <span>⚠️</span> {googleError}
                    </motion.div>
                )}
            </AnimatePresence>

            <FloatingInput id="reg-name" label="الاسم الكامل" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} icon={<User size={18} />} autoComplete="name" required />
            <FloatingInput id="reg-company" label="اسم المشروع / المحل" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} icon={<Building size={18} />} autoComplete="organization" required />
            <FloatingInput id="reg-email" label="البريد الإلكتروني" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} icon={<Mail size={18} />} dir="ltr" autoComplete="email" required />
            <FloatingInput
                id="reg-pass" label="كلمة المرور" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} icon={<Lock size={18} />} dir="ltr" autoComplete="new-password" required minLength={8}
                endIcon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />} onEndIconClick={() => setShowPassword(!showPassword)}
            />

            <button
                type="submit" disabled={isLoading || isGoogleLoading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3 text-lg mt-4"
            >
                {isLoading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                ) : 'إنشاء حسابي المجاني'}
            </button>

            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-4 text-gray-400 font-bold">أو عبر</span>
                </div>
            </div>

            <button
                type="button"
                onClick={() => loginWithGoogle()}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-4 bg-white dark:bg-slate-800 text-gray-700 dark:text-white font-black rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3"
            >
                {isGoogleLoading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
                    />
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        التسجيل السريع عبر جوجل
                    </>
                )}
            </button>
        </form>
    );
};
