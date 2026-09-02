import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '../types';
import { cn } from '../../../core/utils';

interface Props {
  activeMode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const ModeSelector: React.FC<Props> = ({ activeMode, onChange }) => {
  const modes: Array<{ id: ThemeMode; label: string; icon: any }> = [
    { id: 'light', label: 'نهاري', icon: Sun },
    { id: 'dark', label: 'ليلي', icon: Moon },
    { id: 'system', label: 'تلقائي', icon: Monitor },
  ];

  return (
    <div className="flex w-full rounded-xl border bg-gray-100 p-1 dark:border-slate-800 dark:bg-slate-800/50">
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => {
            onChange(m.id);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[10px] font-bold transition-all duration-300',
            activeMode === m.id
              ? 'bg-white text-gray-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-400'
          )}
        >
          <m.icon
            size={14}
            className={cn(activeMode === m.id ? 'text-blue-500' : 'text-gray-400')}
          />
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
