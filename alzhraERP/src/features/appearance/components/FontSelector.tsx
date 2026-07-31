
import React from 'react';
import { useThemeStore } from '../../../lib/themeStore';
import { cn } from '../../../core/utils';
import { Check, Text } from 'lucide-react';

const FONTS = [
  { name: 'Cairo', family: 'Cairo', label: 'كايرو - الافتراضي' },
  { name: 'Tajawal', family: 'Tajawal', label: 'تجوال - عصري' },
  { name: 'Almarai', family: 'Almarai', label: 'المراعي - مقروء' },
];

const FontSelector: React.FC = () => {
  const { draftSettings, setDraftFont, setDraftFontSize } = useThemeStore();
  const { font, fontSize } = draftSettings;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm animate-in fade-in duration-500">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">خطوط الواجهة (Interface Font)</h3>
      <div className="space-y-3">
        {FONTS.map(f => (
          <button
            key={f.name}
            onClick={() => setDraftFont(f.name)}
            className={cn(
              "w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all text-right",
              font === f.name ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50"
            )}
          >
            <div style={{ fontFamily: f.family }}>
              <h4 className="font-bold text-lg text-gray-800 dark:text-slate-100">{f.label}</h4>
              <p className="text-sm text-gray-500 dark:text-slate-400">أبجد هوز حطي كلمن سعفص قرشت</p>
            </div>
            {font === f.name && <Check className="text-blue-500" size={24} />}
          </button>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">حجم الواجهة (Interface Scale)</h3>
        <div className="flex items-center gap-4">
          <Text size={16} className="text-gray-400" />
          <input
            type="range"
            min="14"
            max="18"
            step="0.5"
            value={fontSize}
            onChange={(e) => setDraftFontSize(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <Text size={24} className="text-gray-400" />
        </div>
        <div className="text-center mt-3 text-xs font-mono text-gray-500 dark:text-slate-400">
          حجم الخط الأساسي: {fontSize}px (سيتمปรับขนาด جميع الواجهة)
        </div>
      </div>
    </div>
  );
};

export default FontSelector;
