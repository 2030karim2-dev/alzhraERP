
import React from 'react';
import { Car } from 'lucide-react';

const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-[var(--app-bg)] transition-colors">
    <div className="relative flex items-center justify-center w-24 h-24">
      <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="w-16 h-16 bg-[var(--app-surface)] rounded-full flex items-center justify-center shadow-inner">
        <Car size={28} className="text-blue-600 animate-pulse" />
      </div>
    </div>
    <p className="mt-6 text-sm font-medium text-[var(--app-text-secondary)]">جاري تحميل البيانات...</p>
  </div>
);

export default PageLoader;
