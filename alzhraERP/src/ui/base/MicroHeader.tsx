import React from 'react';
import { LucideIcon, ArrowRight, ArrowLeft, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../core/utils';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { AdvancedTabBar, TabItem } from '../components/AdvancedTabBar';
import { useSearchStore } from '../../core/store/searchStore';

interface MicroHeaderProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  actions?: React.ReactNode;
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  onTabsReorder?: (tabs: TabItem[]) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchWidth?: string;
  extraRow?: React.ReactNode;
  enableDragDrop?: boolean;
  enableKeyboardNav?: boolean;
  enable3D?: boolean;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  isZenMode?: boolean;
  onToggleZen?: () => void;
}

const MicroHeader: React.FC<MicroHeaderProps> = ({
  title,
  icon: Icon,
  iconColor = "text-blue-600",
  actions,
  tabs,
  activeTab,
  onTabChange,
  onTabsReorder,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  searchWidth = "md:w-80",
  extraRow,
  enableDragDrop = false,
  enableKeyboardNav = true,
  enable3D = true,
  isMaximized = false,
  onToggleMaximize,
  isZenMode = false,
  onToggleZen,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dir } = useTranslation();
  const isRoot = location.pathname === '/';
  const setPageSearch = useSearchStore(s => s.setPageSearch);
  const clearPageSearch = useSearchStore(s => s.clearPageSearch);

  React.useEffect(() => {
    if (onSearchChange) {
      setPageSearch({
        value: searchValue || '',
        placeholder: searchPlaceholder || "بحث...",
        onChange: onSearchChange
      });
    } else {
      clearPageSearch();
    }
  }, [searchValue, onSearchChange, searchPlaceholder, setPageSearch, clearPageSearch]);

  React.useEffect(() => {
    return () => {
      clearPageSearch();
    };
  }, [clearPageSearch]);

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  if (isMaximized) return null;

  return (
    <div className="flex-none bg-[var(--app-surface)] border-b border-[var(--app-border)] shadow-sm transition-all no-print z-40">
      <div className="max-w-none mx-auto">
        {/* Main Row */}
        <div className="flex h-8 md:h-9 items-center justify-between px-2 md:px-4">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {!isRoot && (
              <button
                onClick={() => navigate(-1)}
                className="p-1 hover:bg-[var(--app-surface-hover)] rounded-md transition-transform active:scale-90"
                aria-label="Go back"
              >
                <BackIcon size={14} className="text-[var(--app-text-secondary)]" />
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-[var(--app-bg)]/50 px-2 py-0.5 rounded-full border border-[var(--app-border)]">
              <Icon className={iconColor} size={12} />
              <h1 className="text-[9px] md:text-[10px] font-black text-[var(--app-text)] whitespace-nowrap uppercase tracking-widest">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-1.5">
            {isMaximized && onToggleZen && (
              <button
                onClick={onToggleZen}
                className={cn(
                  "p-1 rounded-md border transition-all active:scale-95 shadow-sm",
                  "bg-white dark:bg-slate-800 text-gray-500 hover:text-indigo-500 border-[var(--app-border)]"
                )}
                title={isZenMode ? "Show Header" : "Zen Mode (Hide Header)"}
              >
                {isZenMode ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
            {onToggleMaximize && (
              <button
                onClick={onToggleMaximize}
                className={cn(
                  "p-1 rounded-md border transition-all active:scale-95 shadow-sm",
                  isMaximized 
                    ? "bg-rose-500 text-white border-rose-400 hover:bg-rose-600 shadow-rose-500/20" 
                    : "bg-white dark:bg-slate-800 text-gray-500 hover:text-blue-500 border-[var(--app-border)]"
                )}
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            )}
            {actions}
          </div>
        </div>

        {/* Unified Search & Tab Row - MERGED TO SAVE SPACE */}
        {(tabs || onSearchChange || extraRow) && (
          <div className="flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-1 md:px-3 bg-[var(--app-surface)] border-t border-[var(--app-border)]">
            {/* Tabs Section */}
            {tabs && onTabChange && activeTab && (
              <div className="flex-1 w-full overflow-x-auto no-scrollbar min-w-0">
                <AdvancedTabBar
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={onTabChange}
                  onTabsReorder={onTabsReorder}
                  enableDragDrop={enableDragDrop}
                  enableKeyboardNav={enableKeyboardNav}
                  size="sm"
                  theme="auto"
                  animation={{
                    transitionDuration: 400,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    enable3D: enable3D,
                    enableGlassmorphism: true,
                    enablePulsing: true,
                    enableMultiLayerShadows: true,
                  }}
                  a11y={{
                    ariaLabel: `${title} navigation tabs`,
                    announceChanges: true,
                  }}
                />
              </div>
            )}

            {/* Search/Filter Section - HIDDEN because it's moved to Top Header */}
            {extraRow && (
              <div className={`flex items-center gap-2 w-full ${searchWidth} shrink-0`}>
                {extraRow}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MicroHeader;
