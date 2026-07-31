
import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] overflow-hidden animate-pulse">
      <div className="h-10 bg-[var(--app-bg)] border-b border-[var(--app-border)] flex items-center px-4">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="h-2 w-20 bg-gray-200 dark:bg-slate-700/50 rounded-full mx-2"></div>
        ))}
      </div>
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="h-14 border-b border-[var(--app-border)] bg-[var(--app-surface)] flex items-center px-4">
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800/50 mr-2"></div>
          {[...Array(cols - 1)].map((_, colIndex) => (
            <div key={colIndex} className={`h-2 bg-gray-100 dark:bg-slate-800/50 rounded-full mx-4 ${colIndex === 0 ? 'flex-1' : 'w-24'}`}></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
