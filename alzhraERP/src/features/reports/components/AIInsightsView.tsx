import React from 'react';
import { BrainCircuit } from 'lucide-react';

const AIInsightsView: React.FC = () => {
    return (
        <div className="h-[400px] flex flex-col items-center justify-center gap-6 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center p-8">
            <div className="p-6 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                <BrainCircuit size={48} className="text-slate-400" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">المدقق الذكي قيد إعادة البناء</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    يتم حالياً تطوير وتدريب النواة الذكية للمنظومة لتقديم تحليلات أكثر دقة وذكاءً. سيتم توفير هذا التقرير قريباً.
                </p>
            </div>
        </div>
    );
};

export default AIInsightsView;