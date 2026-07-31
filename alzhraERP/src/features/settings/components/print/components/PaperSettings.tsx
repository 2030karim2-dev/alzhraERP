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
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {t.paper_settings || 'إعدادات الورق'}
                </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.paper_size || 'حجم الورق'}
                    </label>
                    <select
                        value={print.paper_size}
                        onChange={(e) => handleUpdate({ paper_size: e.target.value as 'A4' | 'A5' | 'Letter' | 'Legal' })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    >
                        <option value="A4">A4</option>
                        <option value="A5">A5</option>
                        <option value="Letter">{t.letter || 'Letter'}</option>
                        <option value="Legal">{t.legal || 'Legal'}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.copies || 'عدد النسخ'}
                    </label>
                    <input
                        type="number"
                        min={1}
                        max={5}
                        value={print.copies}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ copies: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.orientation || 'الاتجاه'}
                    </label>
                    <select
                        value={print.orientation}
                        onChange={(e) => handleUpdate({ orientation: e.target.value as 'portrait' | 'landscape' })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    >
                        <option value="portrait">{t.portrait || 'عمودي'}</option>
                        <option value="landscape">{t.landscape || 'أفقي'}</option>
                    </select>
                </div>
            </div>
        </Card>
    );
};
