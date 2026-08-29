import React from 'react';
import { Car } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface SidebarLogoProps {
  isCollapsed: boolean;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ isCollapsed }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`h-16 flex items-center bg-[var(--app-surface)] border-b border-[var(--app-border)] transition-colors duration-150 ${
        isCollapsed ? 'px-0 justify-center' : 'px-4 justify-start'
      }`}
    >
      <div className="flex items-center gap-3 text-[var(--app-text)] overflow-hidden group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
          <Car size={18} className="transition-transform group-hover:rotate-6 duration-200" />
        </div>

        {!isCollapsed && (
          <div className="flex flex-col text-start whitespace-nowrap">
            <h1 className="text-sm font-black leading-tight text-slate-900 dark:text-slate-100 tracking-tight">
              {t('app_title').split(' ')[0]}
            </h1>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
              {t('app_subtitle').split(' ').slice(2).join(' ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarLogo;
