import React from 'react';
import { Maximize } from 'lucide-react';
import Card from '@/ui/base/Card';

interface MarginSettingsProps {
    print: any;
    handleUpdate: (updates: any) => void;
    t: any;
}

export const MarginSettings: React.FC<MarginSettingsProps> = ({ print, handleUpdate, t }) => {
    return (
        <Card className="p-4" isMicro>
            <div className="flex items-center gap-2 mb-4">
                <Maximize className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {t.margins || 'الهوامش'}
                </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.margin_top || 'أعلى (mm)'}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={print.margin_top}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ margin_top: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.margin_bottom || 'أسفل (mm)'}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={print.margin_bottom}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ margin_bottom: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.margin_left || 'يسار (mm)'}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={print.margin_left}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ margin_left: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {t.margin_right || 'يمين (mm)'}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={print.margin_right}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ margin_right: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>
        </Card>
    );
};
