import React from 'react';
import { FileText } from 'lucide-react';
import Card from '@/ui/base/Card';

interface PaperSettingsProps {
  print: any;
  handleUpdate: (updates: any) => void;
  t: any;
}

export const PaperSettings: React.FC<PaperSettingsProps> = ({ print, handleUpdate, t }) => {
  return (
    <Card className="p-4" isMicro>
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {t.paper_settings || 'إعدادات الورق'}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.paper_size || 'حجم الورق'}
          </label>
          <select
            value={print.paper_size}
            onChange={e => {
              handleUpdate({ paper_size: e.target.value as 'A4' | 'A5' | 'Letter' | 'Legal' });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
            <option value="Letter">{t.letter || 'Letter'}</option>
            <option value="Legal">{t.legal || 'Legal'}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.copies || 'عدد النسخ'}
          </label>
          <input
            type="number"
            min={1}
            max={5}
            value={print.copies}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              handleUpdate({ copies: parseInt(e.target.value) || 1 });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.orientation || 'الاتجاه'}
          </label>
          <select
            value={print.orientation}
            onChange={e => {
              handleUpdate({ orientation: e.target.value as 'portrait' | 'landscape' });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="portrait">{t.portrait || 'عمودي'}</option>
            <option value="landscape">{t.landscape || 'أفقي'}</option>
          </select>
        </div>
      </div>
    </Card>
  );
};
