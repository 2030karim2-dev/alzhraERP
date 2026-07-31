
import React, { useState } from 'react';
import { Car,  Mail, Eye, EyeOff } from 'lucide-react';
import { useLogin } from './hooks';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../lib/hooks/useTranslation';
import Input from '../../ui/base/Input';
import Button from '../../ui/base/Button';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { login, isLoading, error } = useLogin();
  const { t } = useTranslation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm p-8 border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in duration-300">

        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 text-white transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Car size={32} strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">{t('login_title')}</h1>
          <p className="text-gray-400 dark:text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">{t('app_subtitle')}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl mb-6 text-xs font-bold text-center border border-rose-100 dark:border-rose-900/50 flex items-center justify-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <Input
            label={t('email_label')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            icon={<Mail className="text-gray-400 dark:text-slate-500" />}
            dir="ltr"
            required
            autoFocus
          />

          <div className="space-y-1">
            <Input
              label={t('password_label')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={showPassword ? <EyeOff className="text-gray-400 dark:text-slate-500" /> : <Eye className="text-gray-400 dark:text-slate-500" />}
              onIconClick={() => setShowPassword(!showPassword)}
              dir="ltr"
              required
              minLength={6}
              title="كلمة المرور يجب أن تكون 6 أحرف على الأقل"
            />
            {password.length > 0 && password.length < 6 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                🔸 Minimum 6 characters required
              </p>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 group-hover:text-blue-600 transition-colors">{t('remember_me')}</span>
            </label>
            <Link to="/forgot-password" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 transition-colors">
              {t('forgot_password_link')}
            </Link>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full rounded-xl py-3 text-sm shadow-xl shadow-blue-500/20 mt-2"
          >
            {t('login_button')}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center border-t border-gray-100 dark:border-slate-800 pt-6">
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500">
            {t('no_account_prompt')}{' '}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline hover:text-blue-700 transition-colors">
              {t('create_account_link')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
