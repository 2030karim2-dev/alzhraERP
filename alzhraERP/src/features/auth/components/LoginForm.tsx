import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useLogin, useGoogleLogin } from '../hooks';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { FloatingInput } from './FloatingInput';

export const LoginForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading, error } = useLogin();
    const { login: loginWithGoogle, isLoading: isGoogleLoading, error: googleError } = useGoogleLogin();
    const { t } = useTranslation();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">أهلاً بك 👋</h2>
                <p className="text-sm text-gray-500 font-medium">قم بتسجيل الدخول للوصول للوحة التحكم</p>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/50 flex gap-2"
                    >
                        <span>⚠️</span> {error}
                    </motion.div>
                )}
                {googleError && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/50 flex gap-2"
                    >
                        <span>⚠️</span> {googleError}
                    </motion.div>
                )}
            </AnimatePresence>

            <FloatingInput
                id="login-email"
                label={t('email_label')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={20} />}
                dir="ltr"
                autoComplete="email"
                required
            />

            <div className="space-y-2">
                <FloatingInput
                    id="login-password"
                    label={t('password_label')}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock size={20} />}
                    dir="ltr"
                    autoComplete="current-password"
                    required
                    endIcon={showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    onEndIconClick={() => setShowPassword(!showPassword)}
                />
                <div className="flex justify-start">
                    <a href="#/forgot-password" title="استعادة كلمة المرور" className="text-xs font-bold text-blue-500 hover:text-blue-600 hover:underline transition-colors uppercase">
                        نسيت كلمة المرور؟
                    </a>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-700 to-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3 text-lg"
            >
                {isLoading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                ) : t('login_button')}
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
                        تسجيل الدخول عبر جوجل
                    </>
                )}
            </button>

            <div className="pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">المطور الذكي</p>
                <p className="text-xs font-black text-gray-700 dark:text-slate-300">عبدالكريم الجعفري</p>
                <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-blue-500 font-bold">
                    <span>779816860</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span>2030.krim2@gmail.com</span>
                </div>
            </div>
        </form>
    );
};
