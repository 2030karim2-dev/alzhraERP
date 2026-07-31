
import React, { useState } from 'react';
import { Car, Lock, Mail, Building, User, CheckCircle, ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { useRegister } from './hooks';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../lib/hooks/useTranslation';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: ''
  });
  
  const { t, dir } = useTranslation();
  const { register, isLoading, error, isSuccess } = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    register(formData.email, formData.password, formData.companyName, formData.fullName);
  };

  const ArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  if (isSuccess) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4 font-cairo">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-emerald-100 dark:border-emerald-900/30 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">تم إنشاء الحساب بنجاح!</h2>
                
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                    تم تسجيل حسابك في النظام.
                    <br/>
                    إذا كانت إعدادات الشركة تتطلب تأكيد البريد الإلكتروني، فقد تم إرسال رابط تفعيل إلى:
                    <br/>
                    <span className="font-bold text-blue-600 font-mono">{formData.email}</span>
                </p>

                <Link to="/login" className="inline-flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700 py-3 px-6 rounded-xl font-bold transition-all w-full justify-center shadow-lg shadow-emerald-500/20">
                    <ArrowIcon size={18} />
                    الانتقال لصفحة الدخول
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4 font-cairo transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100 dark:border-slate-800">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-brand-green to-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg text-white">
            <Car size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('register_page_title')}</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{t('register_page_subtitle')}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg mb-4 text-[11px] text-center border border-blue-100 dark:border-blue-900/30 font-bold">
            💡 إذا كان لديك دعوة من شركة، قم بالتسجيل ببريدك الإلكتروني، وسيتم ربطك بها تلقائياً (اسم المنشأة سيتم تجاهله).
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-xs font-bold text-center border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2">
                <Info size={14} /> {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block">{t('full_name')}</label>
            <div className="relative">
              <User className="absolute right-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm dark:text-white"
                placeholder="الاسم الثلاثي"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block">{t('company_name')}</label>
            <div className="relative">
              <Building className="absolute right-3 top-3 text-gray-400" size={18} />
              <input 
                type="text" 
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm dark:text-white"
                placeholder="اسم المركز / الورشة"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block">{t('email_label')}</label>
            <div className="relative">
              <Mail className="absolute right-3 top-3 text-gray-400" size={18} />
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm dark:text-white"
                placeholder="email@example.com"
                required
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 dark:text-slate-400 block">{t('password_label')}</label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 text-gray-400" size={18} />
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm dark:text-white"
                placeholder="••••••••"
                required
                minLength={6}
                dir="ltr"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-brand-green hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-sm mt-2 flex items-center justify-center gap-2"
          >
            {isLoading ? t('register_loading') : t('register_button')}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-100 dark:border-slate-800">
            <p className="text-sm text-gray-500 dark:text-slate-400">
                {t('already_have_account')}{' '}
                <Link to="/login" className="text-brand-green font-bold hover:underline">
                    {t('login_now')}
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
