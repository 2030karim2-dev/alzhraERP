import React from 'react';
import { Type } from 'lucide-react';
import Card from '@/ui/base/Card';

interface FontSettingsProps {
  print: any;
  handleUpdate: (updates: any) => void;
  t: any;
}

export const FontSettings: React.FC<FontSettingsProps> = ({ print, handleUpdate, t }) => {
  return (
    <Card className="p-4" isMicro>
      <div className="mb-4 flex items-center gap-2">
        <Type className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {t.font_settings || 'إعدادات الخط'}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.font_family || 'نوع الخط'}
          </label>
          <select
            value={print.font_family}
            onChange={e => {
              handleUpdate({ font_family: e.target.value });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="Cairo">Cairo</option>
            <option value="Tajawal">Tajawal</option>
            <option value="Almarai">Almarai</option>
            <option value="Arial">Arial</option>
            <option value="sans-serif">Sans Serif</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.font_size || 'حجم الخط'}
          </label>
          <input
            type="number"
            min={8}
            max={24}
            value={print.font_size}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              handleUpdate({ font_size: parseInt(e.target.value) || 12 });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.line_spacing || 'تباعد الأسطر'}
          </label>
          <input
            type="number"
            min={1}
            max={3}
            step={0.1}
            value={print.line_spacing}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              handleUpdate({ line_spacing: parseFloat(e.target.value) || 1.5 });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
    </Card>
  );
};
