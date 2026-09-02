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
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => {
        onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value);
      }}
      placeholder={placeholder}
      dir={dir}
      className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
    />
  </div>
);
