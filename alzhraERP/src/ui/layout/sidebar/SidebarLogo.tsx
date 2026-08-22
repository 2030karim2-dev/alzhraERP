import React from 'react';
import { Car } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface SidebarLogoProps {
  isCollapsed: boolean;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ isCollapsed }) => {
  const { t } = useTranslation();
  return (
    <div className={`h-14 flex items-center bg-[var(--app-surface)] border-b border-[var(--app-border)] transition-colors duration-150 ${isCollapsed ? 'px-0 justify-center' : 'px-4 justify-start'}`}>
      <div className="flex items-center gap-2.5 text-[var(--app-text)] overflow-hidden">
        <Car size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />

        {!isCollapsed && (
          <div className="flex flex-col text-start whitespace-nowrap">
            <h1 className="text-sm font-bold leading-tight text-[var(--app-text)]">{t('app_title').split(' ')[0]}</h1>
            <span className="text-[10px] text-[var(--app-text-secondary)] font-medium uppercase tracking-wider">{t('app_subtitle').split(' ').slice(2).join(' ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarLogo;
