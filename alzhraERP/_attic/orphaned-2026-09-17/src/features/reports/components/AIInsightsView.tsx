import React from 'react';
import { BrainCircuit } from 'lucide-react';

const AIInsightsView: React.FC = () => {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900 max-md:gap-3 max-md:p-4">
      <div className="rounded-full border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 max-md:p-3">
        <BrainCircuit size={48} className="text-slate-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">
          المدقق الذكي قيد إعادة البناء
        </h3>
        <p className="mx-auto max-w-sm text-sm text-slate-500">
          يتم حالياً تطوير وتدريب النواة الذكية للمنظومة لتقديم تحليلات أكثر دقة وذكاءً. سيتم توفير
          هذا التقرير قريباً.
        </p>
      </div>
    </div>
  );
};

export default AIInsightsView;
