import React from 'react';

export const SettingField: React.FC<{
    label: string;
    type?: string;
    value: string | number;
    onChange: (v: any) => void;
    placeholder?: string;
    dir?: string;
    half?: boolean;
}> = ({ label, type = 'text', value, onChange, placeholder, dir }) => (
    <div>
        <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
            placeholder={placeholder}
            dir={dir}
            className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 dark:text-slate-200 outline-none transition-colors"
        />
    </div>
);
