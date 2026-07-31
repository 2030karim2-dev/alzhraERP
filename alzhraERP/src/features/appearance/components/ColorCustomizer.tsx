
import React, { useRef } from 'react';
import { Check, Pipette } from 'lucide-react';
import { useThemeStore } from '../../../lib/themeStore';
import { cn } from '../../../core/utils';

const ACCENT_COLORS = [
  { name: 'الزمردي', value: '#10b981', class: 'bg-[#10b981]' },
  { name: 'الأزرق', value: '#3b82f6', class: 'bg-[#3b82f6]' },
  { name: 'الوردي', value: '#ec4899', class: 'bg-[#ec4899]' },
  { name: 'البرتقالي', value: '#f97316', class: 'bg-[#f97316]' },
  { name: 'الأرجواني', value: '#8b5cf6', class: 'bg-[#8b5cf6]' },
  { name: 'الأحمر', value: '#ef4444', class: 'bg-[#ef4444]' },
];

const ColorCustomizer: React.FC = () => {
  const { draftSettings, setDraftAccentColor } = useThemeStore();
  const accentColor = draftSettings.accentColor;
  const colorInputRef = useRef<HTMLInputElement>(null);

  const isCustomColor = !ACCENT_COLORS.some(c => c.value === accentColor);
  
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm animate-in fade-in duration-500">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">اللون الأساسي (Accent Color)</h3>
      <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
        {ACCENT_COLORS.map(color => (
          <button
            key={color.name}
            onClick={() => setDraftAccentColor(color.value)}
            className="flex flex-col items-center gap-2 group"
            title={color.name}
          >
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", color.class, accentColor === color.value ? "ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-current" : "ring-4 ring-transparent group-hover:ring-current/20")}>
              {accentColor === color.value && <Check className="text-white" size={24} />}
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">{color.name}</span>
          </button>
        ))}
        {/* Custom Color Picker */}
        <button
            onClick={() => colorInputRef.current?.click()}
            className="flex flex-col items-center gap-2 group"
            title="اختيار لون مخصص"
          >
            <div style={{ backgroundColor: isCustomColor ? accentColor : undefined }} className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all bg-gray-100 dark:bg-slate-800", isCustomColor ? "ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-current" : "ring-4 ring-transparent group-hover:ring-current/20")}>
              <Pipette className={cn(isCustomColor ? "text-white/80" : "text-gray-400")} size={20} />
              <input
                ref={colorInputRef}
                type="color"
                className="absolute w-0 h-0 opacity-0"
                onInput={(e) => setDraftAccentColor((e.target as HTMLInputElement).value)}
                defaultValue={accentColor}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">مخصص</span>
        </button>
      </div>
    </div>
  );
};

export default ColorCustomizer;
