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
    <div className="animate-in fade-in rounded-2xl border bg-[var(--app-surface)] p-4 shadow-sm duration-500 dark:border-slate-800 sm:p-6">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 sm:mb-4">
        اللون الأساسي (Accent Color)
      </h3>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4 md:grid-cols-7">
        {ACCENT_COLORS.map(color => (
          <button
            key={color.name}
            onClick={() => {
              setDraftAccentColor(color.value);
            }}
            className="group flex flex-col items-center gap-2"
            title={color.name}
          >
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                color.class,
                accentColor === color.value
                  ? 'ring-4 ring-current ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                  : 'group-hover:ring-current/20 ring-4 ring-transparent'
              )}
            >
              {accentColor === color.value && <Check className="text-white" size={24} />}
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">
              {color.name}
            </span>
          </button>
        ))}
        {/* Custom Color Picker */}
        <button
          onClick={() => colorInputRef.current?.click()}
          className="group flex flex-col items-center gap-2"
          title="اختيار لون مخصص"
        >
          <div
            style={{ backgroundColor: isCustomColor ? accentColor : undefined }}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 transition-all dark:bg-slate-800',
              isCustomColor
                ? 'ring-4 ring-current ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                : 'group-hover:ring-current/20 ring-4 ring-transparent'
            )}
          >
            <Pipette className={cn(isCustomColor ? 'text-white/80' : 'text-gray-400')} size={20} />
            <input
              ref={colorInputRef}
              type="color"
              className="absolute h-0 w-0 opacity-0"
              onChange={e => {
                setDraftAccentColor(e.target.value);
              }}
              value={accentColor}
            />
          </div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">مخصص</span>
        </button>
      </div>
    </div>
  );
};

export default ColorCustomizer;
