import React, { useState } from 'react';
import { Car, Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { usePasswordReset } from './hooks';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-cairo">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        
        {success ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">{t('reset_link_sent_title')}</h2>
                <p className="text-gray-500 text-sm mb-6">
                    {t('reset_link_sent_desc').replace('{email}', email)}
                </p>
                <Link to="/login" className="text-brand-green font-bold hover:underline flex items-center gap-1">
                    {dir === 'rtl' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                    {t('back_to_login')}
                </Link>
            </div>
        ) : (
            <>
                <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 text-gray-500">
                        <Car size={28} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">{t('forgot_password_title')}</h1>
                    <p className="text-gray-500 text-sm mt-1 text-center">{t('forgot_password_desc')}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 block">{t('email_label')}</label>
                        <div className="relative">
                            <Mail className="absolute right-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all text-sm"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        {isLoading ? t('sending') : t('send_reset_link')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-gray-500 text-sm hover:text-gray-700 font-medium inline-flex items-center gap-1">
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
