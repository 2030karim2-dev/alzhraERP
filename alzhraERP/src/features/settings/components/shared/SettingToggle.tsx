import React from 'react';
import { cn } from '../../../../core/utils';

export const SettingToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between py-2.5">
        <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-slate-200">{label}</p>
            {description && <p className="text-[8px] md:text-[9px] text-gray-400 dark:text-slate-500 mt-0.5">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                checked ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-700"
            )}
        >
            <span className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                checked ? "translate-x-0" : "translate-x-4"
            )} />
        </button>
    </div>
);
