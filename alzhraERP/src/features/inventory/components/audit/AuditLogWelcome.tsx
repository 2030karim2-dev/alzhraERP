import React from 'react';
import { History } from 'lucide-react';

const AuditLogWelcome: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-900 animate-in fade-in zoom-in duration-700">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                <div className="relative p-8 bg-blue-600/5 text-blue-600/30 rounded-[2.5rem]">
                    <History size={64} strokeWidth={1} />
                </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">تدقيق سجل الحركة المتطور</h2>
            <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                اختر صنفاً من مربع البحث بالأعلى لعرض كافة عملياته المخزنية بتنسيق Excel احترافي مع الربط المباشر بالمستخدمين والمستندات.
            </p>
        </div>
    );
};

export default AuditLogWelcome;
