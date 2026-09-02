import React, { useState } from 'react';
import { Car, Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { usePasswordReset } from './hooks';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../core/routes/paths';
import { useTranslation } from '../../lib/hooks/useTranslation';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const { requestReset, isLoading, error, success } = usePasswordReset();
  const { t, dir } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestReset(email);
  };

  return (
    <div className="font-cairo flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {success ? (
          <div className="animate-in fade-in zoom-in flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle size={32} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-800">{t('reset_link_sent_title')}</h2>
            <p className="mb-6 text-sm text-gray-500">
              {t('reset_link_sent_desc').replace('{email}', email)}
            </p>
            <Link
              to={ROUTES.AUTH.LOGIN}
              className="text-brand-green flex items-center gap-1 font-bold hover:underline"
            >
              {dir === 'rtl' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              {t('back_to_login')}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                <Car size={28} />
              </div>
              <h1 className="text-xl font-bold text-gray-800">{t('forgot_password_title')}</h1>
              <p className="mt-1 text-center text-sm text-gray-500">{t('forgot_password_desc')}</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-xs font-bold text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">{t('email_label')}</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                    }}
                    className="focus:ring-brand-green/20 focus:border-brand-green w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm transition-all focus:outline-none focus:ring-2"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-800 py-3 font-bold text-white shadow-sm transition-all hover:bg-gray-900 disabled:bg-gray-400"
              >
                {isLoading ? t('sending') : t('send_reset_link')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to={ROUTES.AUTH.LOGIN}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                {t('back_to_login')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
