// Localization Settings Component
import React from 'react';
import { Globe, Languages, DollarSign, Clock, Calendar, Hash, Save } from 'lucide-react';
import { useSettingsStore } from '../../settingsStore';
import { useI18nStore } from '@/lib/i18nStore';
import Card from '@/ui/base/Card';

export const LocalizationSettings: React.FC = () => {
    const { dictionary: t, setLang } = useI18nStore();
    const { localization, setLocalizationSettings } = useSettingsStore();

    const handleUpdate = (updates: Partial<typeof localization>) => {
        setLocalizationSettings(updates);
    };

    const handleLanguageChange = (lang: 'ar' | 'en') => {
        setLang(lang);
        handleUpdate({ default_language: lang });
    };

    return (
        <div className="space-y-6 p-6 max-md:p-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 max-md:gap-3">
                    <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            {t.localization_settings || 'إعدادات اللغة والموقع'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {t.localization_settings_desc || 'تخصيص اللغة والعملة والمنطقة الزمنية'}
                        </p>
                    </div>
                </div>
                <button className="flex items-center gap-2 max-md:gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                    <Save className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.save || 'حفظ'}</span>
                </button>
            </div>

            {/* Language Settings */}
            <Card className="p-6 max-md:p-3">
                <div className="flex items-center gap-2 max-md:gap-2 mb-4">
                    <Languages className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.language_settings || 'إعدادات اللغة'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-md:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.default_language || 'اللغة الافتراضية'}
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-md:gap-2">
                            <button
                                onClick={() => handleLanguageChange('ar')}
                                className={`flex items-center justify-center gap-2 max-md:gap-2 p-3 max-md:p-3 border-2 rounded-xl transition-all ${localization.default_language === 'ar'
                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
                                    }`}
                            >
                                <span className="text-lg">🇸🇦</span>
                                <span className="font-medium">العربية</span>
                            </button>
                            <button
                                onClick={() => handleLanguageChange('en')}
                                className={`flex items-center justify-center gap-2 max-md:gap-2 p-3 max-md:p-3 border-2 rounded-xl transition-all ${localization.default_language === 'en'
                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
                                    }`}
                            >
                                <span className="text-lg">🇺🇸</span>
                                <span className="font-medium">English</span>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.fallback_language || 'اللغة البديلة'}
                        </label>
                        <select
                            value={localization.fallback_language}
                            onChange={(e) => handleUpdate({ fallback_language: e.target.value as 'ar' | 'en' })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="ar">العربية</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Currency Settings */}
            <Card className="p-6 max-md:p-3">
                <div className="flex items-center gap-2 max-md:gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.currency_settings || 'إعدادات العملة'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-md:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.default_currency || 'العملة الافتراضية'}
                        </label>
                        <select
                            value={localization.default_currency}
                            onChange={(e) => handleUpdate({ default_currency: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="SAR">ريال سعودي (SAR)</option>
                            <option value="AED">درهم إماراتي (AED)</option>
                            <option value="KWD">دينار كويتي (KWD)</option>
                            <option value="QAR">ريال قطري (QAR)</option>
                            <option value="BHD">دينار بحريني (BHD)</option>
                            <option value="OMR">ريال عماني (OMR)</option>
                            <option value="EGP">جنيه مصري (EGP)</option>
                            <option value="USD">دولار أمريكي (USD)</option>
                            <option value="EUR">يورو (EUR)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.currency_symbol || 'رمز العملة'}
                        </label>
                        <input
                            type="text"
                            value={localization.currency_symbol}
                            onChange={(e) => handleUpdate({ currency_symbol: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.decimal_places || 'الكسور العشرية'}
                        </label>
                        <select
                            value={localization.decimal_places}
                            onChange={(e) => handleUpdate({ decimal_places: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value={0}>0</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Timezone Settings */}
            <Card className="p-6 max-md:p-3">
                <div className="flex items-center gap-2 max-md:gap-2 mb-4">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.timezone_settings || 'إعدادات المنطقة الزمنية'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-md:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.timezone || 'المنطقة الزمنية'}
                        </label>
                        <select
                            value={localization.timezone}
                            onChange={(e) => handleUpdate({ timezone: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                            <option value="Asia/Dubai">دبي (GMT+4)</option>
                            <option value="Asia/Kuwait">الكويت (GMT+3)</option>
                            <option value="Asia/Qatar">قطر (GMT+3)</option>
                            <option value="Asia/Bahrain">البحرين (GMT+3)</option>
                            <option value="Asia/Muscat">مسقط (GMT+4)</option>
                            <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                            <option value="Europe/London">لندن (GMT+0/+1)</option>
                            <option value="America/New_York">نيويورك (GMT-5/-4)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.current_time || 'الوقت الحالي'}
                        </label>
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                            {new Date().toLocaleString('en-US', {
                                timeZone: localization.timezone,
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Date Format Settings */}
            <Card className="p-6 max-md:p-3">
                <div className="flex items-center gap-2 max-md:gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.date_format_settings || 'إعدادات تنسيق التاريخ'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-md:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.date_format || 'تنسيق التاريخ'}
                        </label>
                        <select
                            value={localization.date_format}
                            onChange={(e) => handleUpdate({ date_format: e.target.value as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.time_format || 'تنسيق الوقت'}
                        </label>
                        <select
                            value={localization.time_format}
                            onChange={(e) => handleUpdate({ time_format: e.target.value as '12h' | '24h' })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="12h">{t.hour_12 || '12 ساعة'}</option>
                            <option value="24h">{t.hour_24 || '24 ساعة'}</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Number Format Settings */}
            <Card className="p-6 max-md:p-3">
                <div className="flex items-center gap-2 max-md:gap-2 mb-4">
                    <Hash className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        {t.number_format_settings || 'إعدادات تنسيق الأرقام'}
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-md:gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.thousand_separator || 'فاصل الآلاف'}
                        </label>
                        <select
                            value={localization.thousand_separator}
                            onChange={(e) => handleUpdate({ thousand_separator: e.target.value as ',' | '.' | ' ' })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value=",">, (فاصلة)</option>
                            <option value=".">. (نقطة)</option>
                            <option value=" "> (مسافة)</option>
                            <option value="">بدون فاصل</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.decimal_separator || 'فاصل الكسور'}
                        </label>
                        <select
                            value={localization.decimal_separator}
                            onChange={(e) => handleUpdate({ decimal_separator: e.target.value as '.' | ',' })}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value=".">. (نقطة)</option>
                            <option value=",">, (فاصلة)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                            {t.number_preview || 'معاينة'}
                        </label>
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                            {new Intl.NumberFormat(localization.default_language === 'ar' ? 'ar-SA' : 'en-US', {
                                minimumFractionDigits: localization.decimal_places,
                                maximumFractionDigits: localization.decimal_places
                            }).format(1234567.89)}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default LocalizationSettings;
