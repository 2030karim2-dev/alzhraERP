import React from 'react';
import { Car } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface SidebarLogoProps {
  isCollapsed: boolean;
}

const SidebarLogo: React.FC<SidebarLogoProps> = ({ isCollapsed }) => {
  const { t } = useTranslation();
  return (
    <div className={`h-14 flex items-center bg-gradient-to-r from-blue-600 to-indigo-700 transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-4 justify-start'}`}>
      <div className="flex items-center gap-2.5 text-white overflow-hidden">
        <div className="p-1.5 bg-white/20 rounded-lg flex-shrink-0">
          <Car size={18} className="text-white" />
        </div>

        {!isCollapsed && (
          <div className="flex flex-col text-start animate-in fade-in duration-300 whitespace-nowrap">
            <h1 className="text-sm font-bold leading-tight">{t('app_title').split(' ')[0]}</h1>
            <span className="text-[8px] text-blue-100 opacity-80 font-bold uppercase tracking-tighter">{t('app_subtitle').split(' ').slice(2).join(' ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarLogo;
