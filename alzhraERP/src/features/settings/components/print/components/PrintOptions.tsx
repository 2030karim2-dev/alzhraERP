import React from 'react';
import { Eye } from 'lucide-react';
import Card from '@/ui/base/Card';

interface PrintOptionsProps {
    print: any;
    handleUpdate: (updates: any) => void;
    t: any;
}

export const PrintOptions: React.FC<PrintOptionsProps> = ({ print, handleUpdate, t }) => {
    return (
        <Card className="p-4" isMicro>
            <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {t.print_options || 'خيارات الطباعة'}
                </h3>
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="print_header"
                        checked={print.print_header}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ print_header: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="print_header" className="text-sm text-slate-600 dark:text-slate-300">
                        {t.print_header || 'طباعة الترويسة'}
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="print_footer"
                        checked={print.print_footer}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ print_footer: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="print_footer" className="text-sm text-slate-600 dark:text-slate-300">
                        {t.print_footer || 'طباعة التذييل'}
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="print_logo"
                        checked={print.print_logo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ print_logo: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="print_logo" className="text-sm text-slate-600 dark:text-slate-300">
                        {t.print_logo || 'طباعة الشعار'}
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="print_qr_code"
                        checked={print.print_qr_code}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdate({ print_qr_code: e.target.checked })}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="print_qr_code" className="text-sm text-slate-600 dark:text-slate-300">
                        {t.print_qr_code || 'طباعة رمز QR'}
                    </label>
                </div>
            </div>
        </Card>
    );
};
