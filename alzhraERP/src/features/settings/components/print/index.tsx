import React from 'react';
import { Printer, Save } from 'lucide-react';
import { usePrintSettings } from './hooks/usePrintSettings';
import { DefaultPrinterSettings } from './components/DefaultPrinterSettings';
import { PaperSettings } from './components/PaperSettings';
import { MarginSettings } from './components/MarginSettings';
import { FontSettings } from './components/FontSettings';
import { PrintOptions } from './components/PrintOptions';

const PrintSettings: React.FC = () => {
    const { t, print, handleUpdate, handleSave, handleReset } = usePrintSettings();

    return (
        <div className="space-y-4 p-2 md:p-3 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                        <Printer className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tighter">
                            {t.print_settings || 'إعدادات الطباعة'}
                        </h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {t.print_settings_desc || 'تخصيص الطباعة والإيصالات'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="px-3 h-8 text-[10px] font-bold text-slate-500 hover:text-rose-600 uppercase tracking-wider transition-colors"
                    >
                        {t.reset_to_defaults || 'إعادة ضبط'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-5 h-8 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t.save || 'حفظ'}</span>
                    </button>
                </div>
            </div>

            <DefaultPrinterSettings print={print} handleUpdate={handleUpdate} t={t} />
            <PaperSettings print={print} handleUpdate={handleUpdate} t={t} />
            <MarginSettings print={print} handleUpdate={handleUpdate} t={t} />
            <FontSettings print={print} handleUpdate={handleUpdate} t={t} />
            <PrintOptions print={print} handleUpdate={handleUpdate} t={t} />
        </div>
    );
};

export default PrintSettings;
