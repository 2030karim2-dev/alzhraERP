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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-cairo">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">{t('update_password_title')}</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 block">{t('new_password')}</label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600 block">{t('confirm_new_password')}</label>
            <div className="relative">
              <Lock className="absolute right-3 top-3 text-gray-400" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-sm"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isLoading ? t('updating') : t('save_password')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
