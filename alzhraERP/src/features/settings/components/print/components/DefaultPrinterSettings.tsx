import React from 'react';
import { Printer } from 'lucide-react';
import Card from '@/ui/base/Card';

interface DefaultPrinterSettingsProps {
    print: any;
    handleUpdate: (updates: any) => void;
    t: any;
}

export const DefaultPrinterSettings: React.FC<DefaultPrinterSettingsProps> = ({ print, handleUpdate, t }) => {
    return (
        <Card className="p-4" isMicro>
            <div className="flex items-center gap-2 mb-4">
                <Printer className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {t.default_printer || 'الطابعة الافتراضية'}
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.printer_type || 'نوع الطابعة'}
                    </label>
                    <select
                        value={print.default_printer}
                        onChange={(e) => handleUpdate({ default_printer: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    >
                        <option value="thermal">{t.thermal_printer || 'طابعة حرارية (80mm)'}</option>
                        <option value="thermal_58">{t.thermal_58_printer || 'طابعة حرارية (58mm)'}</option>
                        <option value="a4">{t.a4_printer || 'طابعة A4'}</option>
                        <option value="pdf">{t.pdf_printer || 'PDF'}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.printer_name || 'اسم الطابعة'}
                    </label>
                    <input
                        type="text"
                        value={print.printer_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ printer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                        placeholder={t.printer_name_placeholder || 'أدخل اسم الطابعة...'}
                    />
                </div>
            </div>
        </Card>
    );
};
