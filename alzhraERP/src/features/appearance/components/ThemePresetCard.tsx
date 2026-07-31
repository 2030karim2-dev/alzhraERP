
import React from 'react';
import { Check, Moon, Sparkles } from 'lucide-react';
import { ThemePreset } from '../types';
import { cn } from '../../../core/utils';

interface Props {
  preset: ThemePreset;
  isActive: boolean;
  onSelect: (id: string) => void;
}

const ThemePresetCard: React.FC<Props> = ({ preset, isActive, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(preset.id)}
      className={cn(
        "group relative flex flex-col rounded-2xl md:rounded-3xl border-2 transition-all duration-500 text-right overflow-hidden active:scale-[0.97] hover:shadow-lg",
        isActive
          ? "border-blue-500 shadow-xl shadow-blue-500/15 ring-2 ring-blue-500/20"
          : "border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800"
      )}
    >
      {/* Selection Badge */}
      <div className={cn(
        "absolute top-3 left-3 z-20 transition-all duration-500",
        isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}>
        <div className="bg-blue-500 text-white w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Check size={12} strokeWidth={4} />
        </div>
      </div>

      {/* Emoji Badge */}
      {preset.emoji && (
        <div className="absolute top-3 right-3 z-20 text-lg md:text-xl opacity-80 group-hover:scale-125 transition-transform duration-300">
          {preset.emoji}
        </div>
      )}

      {/* Preview Section — Enhanced */}
      <div className="relative h-24 md:h-32 w-full overflow-hidden">
        {/* Base Color */}
        <div className="absolute inset-0" style={{ backgroundColor: preset.previewColor }} />

        {/* Color Strips — Diagonal */}
        <div className="absolute inset-0 flex">
          {preset.colors.map((color, i) => (
            <div
              key={i}
              className="flex-1 opacity-90 transition-opacity group-hover:opacity-100"
              style={{
                backgroundColor: color,
                clipPath: i === 0
                  ? 'polygon(0 0, 100% 0, 70% 100%, 0 100%)'
                  : i === 1
                    ? 'polygon(30% 0, 100% 0, 70% 100%, 0 100%)'
                    : 'polygon(30% 0, 100% 0, 100% 100%, 0 100%)'
              }}
            />
          ))}
        </div>

        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Dark Mode Indicator */}
        {preset.isDark && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <Moon size={8} className="text-white/80" />
            <span className="text-[7px] md:text-[8px] font-bold text-white/80 uppercase">DARK</span>
          </div>
        )}

        {/* Accent Color Dot */}
        {preset.accent && (
          <div className="absolute bottom-2 right-2">
            <div
              className="w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white/50 shadow-md transition-transform group-hover:scale-110"
              style={{ backgroundColor: preset.accent }}
            />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 md:p-4 flex-1 bg-white dark:bg-slate-900 transition-colors text-right border-t border-gray-50 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-[10px] md:text-sm font-bold text-gray-800 dark:text-slate-100 mb-1 truncate">
              {preset.name}
            </h4>
            <p className="text-[8px] md:text-xs font-bold text-gray-400 dark:text-slate-500 leading-tight line-clamp-2">
              {preset.description}
            </p>
          </div>
        </div>

        {/* Color Palette Preview */}
        <div className="flex items-center gap-1 mt-2.5">
          {preset.colors.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-gray-200 dark:border-slate-700 transition-transform group-hover:scale-110"
              style={{ backgroundColor: color }}
            />
          ))}
          {isActive && (
            <span className="mr-auto text-[7px] md:text-[9px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={8} />
              مفعّل
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ThemePresetCard;
