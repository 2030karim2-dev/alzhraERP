/**
 * Dhikr & Prayer Ticker — Settings panel.
 * Master toggle, adhan sound toggle, location (latitude/longitude),
 * calculation method, and a live preview of today's prayer times.
 */
import React, { useState } from 'react';
import { Moon, MapPin, Volume2, VolumeX, BellOff } from 'lucide-react';
import Card from '@/ui/base/Card';
import { useDhikrStore } from '../../../dhikr/dhikrStore';
import { computePrayerTimes } from '../../../dhikr/prayerTimes';
import { PRAYER_LABELS } from '../../../dhikr/dhikrList';
import type { CalculationMethodKey } from '../../../dhikr/types';
import { cn } from '../../../../core/utils';

const METHODS: { key: CalculationMethodKey; label: string; desc: string }[] = [
    { key: 'qatar', label: 'قطر / ماثر', desc: '18° / 18° — الشائع في الخليج' },
    { key: 'ummAlQura', label: 'أم القرى', desc: 'منهج المملكة العربية السعودية' },
    { key: 'muslimWorldLeague', label: 'رابطة العالم الإسلامي', desc: '18° / 17° — شائع عالمياً' },
];

export const DhikrSettings: React.FC = () => {
    const {
        enabled, setEnabled,
        soundEnabled, setSoundEnabled,
        latitude, longitude, city,
        setLocation, calculationMethod, setCalculationMethod,
    } = useDhikrStore();

    const [latInput, setLatInput] = useState(latitude?.toString() ?? '');
    const [lngInput, setLngInput] = useState(longitude?.toString() ?? '');
    const [cityInput, setCityInput] = useState(city);
    const [saved, setSaved] = useState(false);

    const parsedLat = Number.parseFloat(latInput);
    const parsedLng = Number.parseFloat(lngInput);
    const hasLocation = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

    const preview = computePrayerTimes(
        hasLocation ? parsedLat : null,
        hasLocation ? parsedLng : null,
        calculationMethod
    );

    const handleSave = () => {
        setLocation(
            Number.isFinite(parsedLat) ? parsedLat : null,
            Number.isFinite(parsedLng) ? parsedLng : null,
            cityInput.trim()
        );
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                        <Moon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            شريط الذكر وأوقات الصلاة
                        </h2>
                        <p className="text-sm text-slate-500">
                            تذكير هادئ بذكر الله وأوقات الصلاة — دون إزعاج
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                    {saved ? 'تم الحفظ ✓' : 'حفظ'}
                </button>
            </div>

            {/* Toggles */}
            <Card className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Moon className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">إظهار الشريط</p>
                            <p className="text-xs text-slate-500">شريط رفيع أعلى الصفحة يتناوب الأذكار وأوقات الصلاة</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setEnabled(!enabled)}
                        role="switch"
                        aria-checked={enabled}
                        className={cn(
                            'relative w-12 h-7 rounded-full transition-colors shrink-0',
                            enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                        )}
                    >
                        <span className={cn(
                            'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all',
                            enabled ? 'left-6' : 'left-1'
                        )} />
                    </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {soundEnabled ? <Volume2 className="w-5 h-5 text-slate-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                        <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">صوت الأذان</p>
                            <p className="text-xs text-slate-500">يُشغَّل صوتٌ خفيف لحظة دخول وقت الصلاة فقط — ويبدأ بعد أول تفاعل منك (قاعدة المتصفحات)</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        role="switch"
                        aria-checked={soundEnabled}
                        className={cn(
                            'relative w-12 h-7 rounded-full transition-colors shrink-0',
                            soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                        )}
                    >
                        <span className={cn(
                            'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all',
                            soundEnabled ? 'left-6' : 'left-1'
                        )} />
                    </button>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">الموقع لحساب أوقات الصلاة</h3>
                </div>
                <p className="text-xs text-slate-500 -mt-2">
                    أدخل إحداثيات موقعك (تُحسب الأوقات محلياً دون إنترنت). يمكنك إيجادها من خرائط جوجل — أيمن الفأرة على موقعك.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">المدينة (اختياري)</label>
                        <input
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            placeholder="مثال: الرياض"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">خط العرض (Latitude)</label>
                        <input
                            dir="ltr"
                            value={latInput}
                            onChange={(e) => setLatInput(e.target.value)}
                            placeholder="24.7136"
                            inputMode="decimal"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">خط الطول (Longitude)</label>
                        <input
                            dir="ltr"
                            value={lngInput}
                            onChange={(e) => setLngInput(e.target.value)}
                            placeholder="46.6753"
                            inputMode="decimal"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">منهج الحساب</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {METHODS.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => setCalculationMethod(m.key)}
                                className={cn(
                                    'p-3 rounded-xl border-2 text-right transition-all',
                                    calculationMethod === m.key
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                                )}
                            >
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{m.label}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {preview && (
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BellOff className="w-5 h-5 text-slate-400" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">أوقات اليوم (معاينة)</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {preview.today.map((entry) => (
                            <div key={entry.name} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-center">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{PRAYER_LABELS[entry.name] ?? entry.name}</p>
                                <p className="text-sm font-black text-slate-800 dark:text-white mt-1" dir="ltr">
                                    {new Date(entry.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))}
                    </div>
                    {preview.next && preview.nextInMinutes != null && (
                        <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300 font-bold">
                            الصلاة القادمة: {PRAYER_LABELS[preview.next.name]} بعد {preview.nextInMinutes} دقيقة
                        </p>
                    )}
                </Card>
            )}

            {!hasLocation && (
                <p className="text-xs text-slate-400">
                    أدخل خط العرض وخط الطول أعلاه لعرض أوقات الصلاة.
                </p>
            )}
        </div>
    );
};

export default DhikrSettings;
