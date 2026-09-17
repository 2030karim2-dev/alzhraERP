import React from 'react';
import { History } from 'lucide-react';

const AuditLogWelcome: React.FC = () => {
  return (
    <div className="animate-in fade-in zoom-in flex flex-1 flex-col items-center justify-center bg-[var(--app-surface)] p-12 text-center duration-700">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative rounded-[2.5rem] bg-blue-600/5 p-8 text-blue-600/30">
          <History size={64} strokeWidth={1} />
        </div>
      </div>
      <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
        تدقيق سجل الحركة المتطور
      </h2>
      <p className="max-w-sm text-xs font-medium leading-relaxed text-gray-500 dark:text-gray-400">
        اختر صنفاً من مربع البحث بالأعلى لعرض كافة عملياته المخزنية بتنسيق Excel احترافي مع الربط
        المباشر بالمستخدمين والمستندات.
      </p>
    </div>
  );
};

export default AuditLogWelcome;
