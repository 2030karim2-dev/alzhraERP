import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Car, Menu, Search, X } from 'lucide-react';
import HeaderActions from './header/HeaderActions';
import { MENU_ITEMS } from '../../core/constants';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { useSearchStore } from '../../core/store/searchStore';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, dir } = useTranslation();

  const { pageSearchValue, pageSearchPlaceholder, onPageSearchChange } = useSearchStore();
  const isPageSearchActive = !!onPageSearchChange;

  const [globalSearchVal, setGlobalSearchVal] = useState('');

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchVal.trim()) {
      navigate(`/inventory?search=${encodeURIComponent(globalSearchVal.trim())}`);
    }
  };

  const currentRoute = MENU_ITEMS.find((item) => (
    item.path === '/'
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  ));
  const title = currentRoute ? t(currentRoute.labelKey) : 'الرئيسية';

  return (
    <header className="flex h-10 md:h-12 items-center justify-between px-3 md:px-5 bg-[var(--app-surface)]/80 backdrop-blur-md border-b border-[var(--app-border)] flex-shrink-0 z-50 sticky top-0 transition-colors no-print">
      {/* Left side: Logo/Title (Mobile) / Page Title (Desktop) */}
      <div className="flex items-center gap-3 flex-1 md:flex-none">
        {/* Mobile Menu Button */}
        <button onClick={onMenuClick} className="md:hidden p-2 -ms-2 text-gray-500 dark:text-slate-400" aria-label={t('menu') || 'فتح القائمة'}>
          <Menu size={24} />
        </button>
        <div
          onClick={() => navigate('/')}
          className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all duration-300 md:hidden"
          aria-label="الرئيسية"
        >
          <Car size={14} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm md:text-lg font-bold text-[var(--app-text)] leading-none">{title}</h1>
          <span className="text-[8px] md:hidden text-[var(--app-text-secondary)] font-semibold uppercase tracking-widest mt-1">Al-Zahra Smart ERP</span>
        </div>
      </div>

      {/* Center: Search (Desktop) */}
      <div className="hidden md:flex flex-1 justify-center px-8">
        <div className="relative group w-full max-w-xl">
          {isPageSearchActive ? (
            <div className="relative animate-in zoom-in-95 duration-300">
               <input
                type="text"
                placeholder={pageSearchPlaceholder}
                value={pageSearchValue}
                onChange={(e) => onPageSearchChange(e.target.value)}
                autoFocus
                className="w-full bg-blue-50/50 dark:bg-blue-900/20 border border-blue-500/30 rounded-lg py-1.5 ps-9 pe-10 text-xs text-[var(--app-text)] placeholder:text-blue-400 dark:placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/10"
              />
              <Search className={`absolute top-2.5 text-blue-500 transition-colors ${dir === 'rtl' ? 'right-3' : 'left-3'}`} size={14} />
              {pageSearchValue && (
                <button 
                  onClick={() => onPageSearchChange('')}
                  className={`absolute top-2.5 text-blue-400 hover:text-rose-500 transition-colors ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleGlobalSearchSubmit} className="w-full relative">
              <input
                type="text"
                placeholder={t('global_search_placeholder')}
                value={globalSearchVal}
                onChange={(e) => setGlobalSearchVal(e.target.value)}
                autoComplete="off"
                aria-label={t('global_search_placeholder')}
                className="w-full bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg py-1.5 ps-9 pe-10 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-bold"
              />
              <Search className={`absolute top-2.5 text-[var(--app-text-secondary)] group-focus-within:text-blue-500 transition-colors ${dir === 'rtl' ? 'right-3' : 'left-3'}`} size={14} />
              {globalSearchVal && (
                <button 
                  type="button"
                  onClick={() => setGlobalSearchVal('')}
                  className={`absolute top-2.5 text-gray-400 hover:text-rose-500 transition-colors ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
                >
                  <X size={14} />
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Right side: Global Actions (Profile, Theme, etc) */}
      <HeaderActions />
    </header>
  );
};

export default Header;
