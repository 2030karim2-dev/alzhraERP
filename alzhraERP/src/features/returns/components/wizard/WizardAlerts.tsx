import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    validationErrors: string[];
}

export const WizardAlerts: React.FC<Props> = ({ validationErrors }) => {
    if (validationErrors.length === 0) return null;

    return (
        <div className="mx-6 mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
            <div className="flex items-start gap-3">
                <AlertTriangle className="text-rose-500 mt-0.5 flex-shrink-0" size={18} />
                <div>
                    <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-1">تنبيهات جودة البيانات</h4>
                    <ul className="space-y-1">
                        {validationErrors.map((err, idx) => (
                            <li key={idx} className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                <span className="w-1 h-1 bg-rose-400 rounded-full" />
                                {err}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
