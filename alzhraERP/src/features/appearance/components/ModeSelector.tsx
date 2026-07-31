
import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeMode } from '../types';
import { cn } from '../../../core/utils';

interface Props {
  activeMode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const ModeSelector: React.FC<Props> = ({ activeMode, onChange }) => {
  const modes: { id: ThemeMode; label: string; icon: any }[] = [
    { id: 'light', label: 'نهاري', icon: Sun },
    { id: 'dark', label: 'ليلي', icon: Moon },
    { id: 'system', label: 'تلقائي', icon: Monitor },
  ];

  return (
    <div className="flex bg-gray-100 dark:bg-slate-800/50 p-1 rounded-xl border dark:border-slate-800 w-full">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all duration-300 font-bold text-[10px]",
            activeMode === m.id 
              ? "bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-slate-400"
          )}
        >
          <m.icon 
            size={14}
            className={cn(activeMode === m.id ? "text-blue-500" : "text-gray-400")} 
          />
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
