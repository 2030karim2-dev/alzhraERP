
import React from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useJournals } from '../../hooks/index';
import { BookOpen, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';

const RecentJournals: React.FC = () => {
  const { data, isLoading } = useJournals();

  const journals = data?.pages?.flat() || [];

  if (isLoading) {
    return <div className="p-10 text-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-none border border-gray-100 dark:border-slate-800 p-3 shadow-sm">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
        <BookOpen size={14} className="text-gray-400" /> آخر القيود المسجلة
      </h3>
      <div className="space-y-1">
        {journals?.slice(0, 5).map((j: any) => (
          <div key={j.id} className="flex justify-between items-center p-2 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-700 dark:text-slate-200 truncate">{j.description}</p>
              <span className="text-[9px] text-gray-400 font-mono">{j.date}</span>
            </div>
            <span dir="ltr" className="text-[11px] font-bold font-mono text-gray-800 dark:text-slate-100">
              {formatCurrency(j.total_amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentJournals;