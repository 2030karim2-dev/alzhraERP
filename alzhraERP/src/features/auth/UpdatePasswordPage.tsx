import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { usePasswordReset } from './hooks';
import { useFeedbackStore } from '../feedback/store';
import { useTranslation } from '../../lib/hooks/useTranslation';

const UpdatePasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { confirmUpdate, isLoading, error } = usePasswordReset();
  const { showToast } = useFeedbackStore();
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('كلمتا المرور غير متطابقتين', 'warning');
      return;
    }
    confirmUpdate(password);
  };

  return (
    <div className="font-cairo flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">{t('update_password_title')}</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">{t('new_password')}</label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                }}
                className="focus:ring-brand-green/20 focus:border-brand-green w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm transition-all focus:outline-none focus:ring-2"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">
              {t('confirm_new_password')}
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                }}
                className="focus:ring-brand-green/20 focus:border-brand-green w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm transition-all focus:outline-none focus:ring-2"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isLoading ? t('updating') : t('save_password')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
