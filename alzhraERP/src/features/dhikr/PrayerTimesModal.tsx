import React, { useState } from 'react';
import {
    Moon,
    Sun,
    Clock,
    MapPin,
    Volume2,
    VolumeX,
    Sparkles,
    Check,
    X,
    Compass,
    RotateCcw,
    HeartHandshake,
    ShieldAlert,
    Coins,
    BookOpen
} from 'lucide-react';
import { useDhikrStore, POPULAR_CITIES } from './dhikrStore';
import { usePrayerTimes } from './usePrayerTimes';
import { DHIKR_LIST } from './dhikrList';
import { playAdhanSound } from './playAdhan';
import Modal from '../../ui/base/Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const PrayerTimesModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const {
        city,
        soundEnabled,
        setSoundEnabled,
        setPresetCity,
        detectGpsLocation,
        calculationMethod,
        setCalculationMethod
    } = useDhikrStore();

    const { prayerTimes } = usePrayerTimes();
    const [isLocating, setIsLocating] = useState(false);
    const [gpsStatus, setGpsStatus] = useState<string | null>(null);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState<'prayers' | 'debt_duas' | 'istighfar' | 'rizq' | 'tasbeeh'>('prayers');
    const [tasbeehCount, setTasbeehCount] = useState(0);
    const [selectedDhikr, setSelectedDhikr] = useState('سُبْحَانَ اللهِ وَبِحَمْدِهِ ، سُبْحَانَ اللهِ الْعَظِيمِ');

    const handleGpsClick = async () => {
        setIsLocating(true);
        setGpsStatus('جاري تحديد الموقع عبر GPS...');
        const result = await detectGpsLocation();
        setIsLocating(false);
        if (result.success) {
            setGpsStatus(`تم التحديد بنجاح: ${result.city}`);
            setTimeout(() => setGpsStatus(null), 4000);
        } else {
            setGpsStatus(result.error || 'تعذر جلب الموقع');
            setTimeout(() => setGpsStatus(null), 5000);
        }
    };

    const handleTestAdhan = () => {
        void playAdhanSound(true);
    };

    // Filter adhkar by category
    const debtDuas = DHIKR_LIST.filter(d => d.id.startsWith('dua-debt'));
    const istighfarDuas = DHIKR_LIST.filter(d => d.id.includes('astaghfirullah') || d.id.includes('sayyid'));
    const rizqDuas = DHIKR_LIST.filter(d => d.id.startsWith('rizq') || d.id.includes('market') || d.id.includes('tawakkul'));

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            size="2xl"
            hideHeader
        >
            <div className="relative font-cairo text-slate-800 dark:text-slate-100 p-4 md:p-6 overflow-hidden">
                {/* Header Strip with Islamic Gradient */}
                <div className="relative z-10 flex items-center justify-between pb-4 mb-4 border-b border-emerald-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <Moon size={20} className="text-amber-200" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold bg-gradient-to-l from-emerald-600 to-teal-700 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                                الواحة الإيمانية ومواقيت الصلاة
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <span>{city || 'الرياض (تلقائي)'}</span>
                                <span className="text-emerald-500">•</span>
                                <span>تقويم أم القرى</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex flex-wrap gap-2 mb-5">
                    <button
                        onClick={() => setActiveTab('prayers')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'prayers'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-102'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Clock size={14} />
                        <span>مواقيت الصلاة والأذان</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('debt_duas')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'debt_duas'
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-102'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Coins size={14} />
                        <span>أدعية قضاء الدين</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('rizq')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'rizq'
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-102'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Sparkles size={14} />
                        <span>البركة في الرزق والتجارة</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('istighfar')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'istighfar'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-102'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <HeartHandshake size={14} />
                        <span>سيد الاستغفار والتوبة</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('tasbeeh')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'tasbeeh'
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-102'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700'
                        }`}
                    >
                        <RotateCcw size={14} />
                        <span>السبحة الإلكترونية</span>
                    </button>
                </div>

                {/* Tab 1: Prayer Times */}
                {activeTab === 'prayers' && (
                    <div className="space-y-4">
                        {/* City & GPS Selector Bar */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowCityDropdown(!showCityDropdown)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-sm transition-all"
                                    >
                                        <MapPin size={14} className="text-emerald-600" />
                                        <span>المدينة: {city || 'شحن - المهرة (اليمن)'}</span>
                                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.2 rounded text-emerald-700 dark:text-emerald-300">تغيير ▼</span>
                                    </button>

                                    {showCityDropdown && (
                                        <div className="absolute top-full right-0 mt-2 w-72 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-emerald-500/30 rounded-2xl shadow-2xl z-50 p-2 custom-scrollbar animate-in zoom-in-95 duration-200">
                                            <div className="p-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                                                اختر المدينة (اليمن والخليج)
                                            </div>
                                            <div className="py-1">
                                                {POPULAR_CITIES.map((c) => (
                                                    <button
                                                        key={`${c.name}-${c.country}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setPresetCity(c);
                                                            setShowCityDropdown(false);
                                                        }}
                                                        className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                                                            city?.includes(c.name)
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        <span>{c.name}</span>
                                                        <span className={`text-[10px] ${city?.includes(c.name) ? 'text-emerald-100' : 'text-slate-400'}`}>
                                                            {c.country}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleGpsClick}
                                    disabled={isLocating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-emerald-50 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <MapPin size={14} className={isLocating ? 'animate-bounce text-emerald-500' : 'text-emerald-500'} />
                                    <span>{isLocating ? 'جاري تحديد GPS...' : 'تحديد الموقع تلقائياً بالـ GPS'}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                        soundEnabled
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                                    }`}
                                >
                                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                    <span>{soundEnabled ? 'صوت الأذان مفعل' : 'صوت الأذان مكتوم'}</span>
                                </button>

                                <button
                                    onClick={handleTestAdhan}
                                    title="تشغيل نغمة أذان تجريبية"
                                    className="px-2.5 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 rounded-xl text-xs font-bold transition-colors"
                                >
                                    تجربة الأذان 🔊
                                </button>
                            </div>

                            {gpsStatus && (
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse w-full text-center">
                                    {gpsStatus}
                                </span>
                            )}
                        </div>

                        {/* Prayer Times 5 Cards Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            {prayerTimes?.today.map((prayer) => {
                                const isNext = prayerTimes.next?.name === prayer.name;
                                return (
                                    <div
                                        key={prayer.name}
                                        className={`relative p-3.5 rounded-2xl border text-center transition-all ${
                                            isNext
                                                ? 'bg-gradient-to-b from-emerald-500 to-teal-700 text-white border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400/50 z-10'
                                                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-emerald-300'
                                        }`}
                                    >
                                        {isNext && (
                                            <span className="absolute -top-2.5 right-1/2 translate-x-1/2 bg-amber-400 text-slate-900 text-[9px] font-bold px-2 py-0.5 rounded-full shadow">
                                                القادمة
                                            </span>
                                        )}
                                        <div className="flex justify-center mb-1.5">
                                            {prayer.name === 'fajr' && <Moon size={20} className={isNext ? 'text-amber-200' : 'text-indigo-400'} />}
                                            {prayer.name === 'dhuhr' && <Sun size={20} className={isNext ? 'text-amber-200' : 'text-amber-500'} />}
                                            {prayer.name === 'asr' && <Sun size={20} className={isNext ? 'text-amber-200' : 'text-orange-400'} />}
                                            {prayer.name === 'maghrib' && <Sun size={20} className={isNext ? 'text-amber-200' : 'text-rose-400'} />}
                                            {prayer.name === 'isha' && <Moon size={20} className={isNext ? 'text-amber-200' : 'text-blue-400'} />}
                                        </div>
                                        <h4 className="text-xs font-bold mb-1">{prayer.label}</h4>
                                        <p className="text-sm font-black font-mono tracking-tight" dir="ltr">
                                            {formatTime(prayer.time)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Next Prayer Countdown Alert */}
                        {prayerTimes?.next && (
                            <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                                        <Clock size={22} className="text-amber-200 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">
                                            المتبقي على {prayerTimes.next.label}:
                                        </h4>
                                        <p className="text-xs text-emerald-100">
                                            يحين الأذان عند الساعة {formatTime(prayerTimes.next.time)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-center bg-black/20 px-4 py-2 rounded-xl border border-white/10">
                                    <span className="text-xl md:text-2xl font-black font-mono text-amber-300">
                                        {prayerTimes.nextInMinutes}
                                    </span>
                                    <span className="text-xs block font-bold text-white/80">دقيقة</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Debt Relief Duas */}
                {activeTab === 'debt_duas' && (
                    <div className="space-y-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
                            <Coins size={16} className="text-amber-600 shrink-0" />
                            <span>أدعية نبوية مأثورة لقضاء الديون وتفريج الكروب وتيسير الأمور بإذن الله</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
                            {debtDuas.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all relative group"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                                            «{item.text}»
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab 3: Rizq & Commerce Blessings */}
                {activeTab === 'rizq' && (
                    <div className="space-y-3">
                        <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-xs text-teal-800 dark:text-teal-300 font-bold flex items-center gap-2">
                            <Sparkles size={16} className="text-teal-600 shrink-0" />
                            <span>أدعية استجلاب الرزق والبركة في البيع والشراء والعمل والتجارة</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
                            {rizqDuas.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all relative group"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                                            «{item.text}»
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab 4: Istighfar & Repentance */}
                {activeTab === 'istighfar' && (
                    <div className="space-y-3">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-800 dark:text-blue-300 font-bold flex items-center gap-2">
                            <HeartHandshake size={16} className="text-blue-600 shrink-0" />
                            <span>سيد الاستغفار وأعظم صيغ التوبة ومحو الذنوب وفتح أبواب الفرج</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
                            {istighfarDuas.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all relative group"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">
                                            «{item.text}»
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab 5: Electronic Tasbeeh Counter */}
                {activeTab === 'tasbeeh' && (
                    <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
                        <div className="w-full max-w-md p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block mb-1">
                                الذكر الحالي:
                            </span>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {selectedDhikr}
                            </p>
                        </div>

                        {/* Interactive Circle Counter Button */}
                        <div className="relative">
                            <button
                                onClick={() => setTasbeehCount((c) => c + 1)}
                                className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 text-white flex flex-col items-center justify-center shadow-2xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none border-4 border-purple-300/30"
                            >
                                <span className="text-3xl md:text-4xl font-black font-mono">
                                    {tasbeehCount}
                                </span>
                                <span className="text-xs font-bold text-purple-200 mt-1">اضغط للتسبيح 📿</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setTasbeehCount(0)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                                <RotateCcw size={14} />
                                <span>إعادة تصفير العداد</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PrayerTimesModal;
