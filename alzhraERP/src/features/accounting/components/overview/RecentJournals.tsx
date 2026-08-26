
import React from 'react';
// Fix: Corrected import path to point to the barrel file.
import { useJournals } from '../../hooks/index';
import { BookOpen, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import Card from '../../../../ui/base/Card';

const RecentJournals: React.FC = () => {
  const { data, isLoading } = useJournals();

  const journals = data?.pages?.flat() || [];

  if (isLoading) {
    return <Card variant="ledger" className="flex items-center justify-center p-8 max-md:p-4"><Loader2 className="animate-spin text-blue-500" /></Card>;
  }

  return (
    <Card variant="ledger">
      <h3 className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
        <BookOpen size={14} className="text-[var(--app-text-secondary)]" /> آخر القيود المسجلة
      </h3>
      <div className="space-y-1">
        {journals?.slice(0, 5).map((j: any) => (
          <div key={j.id} className="flex justify-between items-center p-2 hover:bg-[var(--app-surface-hover)] transition-colors">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[var(--app-text)] truncate">{j.description}</p>
              <span className="text-[10px] text-[var(--app-text-secondary)] font-mono">{j.entry_date}</span>
            </div>
            <span dir="ltr" className="text-[11px] font-bold font-mono text-[var(--app-text)]">
              {formatCurrency(j.total_amount)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentJournals;