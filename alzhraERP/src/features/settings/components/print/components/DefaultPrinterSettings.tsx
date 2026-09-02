import React from 'react';
import { Printer } from 'lucide-react';
import Card from '@/ui/base/Card';

interface DefaultPrinterSettingsProps {
  print: any;
  handleUpdate: (updates: any) => void;
  t: any;
}

export const DefaultPrinterSettings: React.FC<DefaultPrinterSettingsProps> = ({
  print,
  handleUpdate,
  t,
}) => {
  return (
    <Card className="p-4" isMicro>
      <div className="mb-4 flex items-center gap-2">
        <Printer className="h-5 w-5 text-slate-400" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {t.default_printer || 'الطابعة الافتراضية'}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.printer_type || 'نوع الطابعة'}
          </label>
          <select
            value={print.default_printer}
            onChange={e => {
              handleUpdate({ default_printer: e.target.value });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="thermal">{t.thermal_printer || 'طابعة حرارية (80mm)'}</option>
            <option value="thermal_58">{t.thermal_58_printer || 'طابعة حرارية (58mm)'}</option>
            <option value="a4">{t.a4_printer || 'طابعة A4'}</option>
            <option value="pdf">{t.pdf_printer || 'PDF'}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-500">
            {t.printer_name || 'اسم الطابعة'}
          </label>
          <input
            type="text"
            value={print.printer_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              handleUpdate({ printer_name: e.target.value });
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
    </Card>
  );
};
