import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../../../core/utils';

export const SettingSection: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    color: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}> = ({ icon, title, subtitle, color, defaultOpen = true, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl text-white shadow-md", color)}>
                        {icon}
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs md:text-sm font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">{title}</h3>
                        {subtitle && <p className="text-[8px] md:text-[9px] text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {open && <div className="px-4 md:px-5 pb-5 border-t border-gray-100 dark:border-slate-800 pt-4">{children}</div>}
        </div>
    );
};
