/**
 * Workspace Tab Context Menu — قائمة الخيارات المنبثقة بالزر الأيمن للتبويب.
 *
 * @module ui/layout/tabs/WorkspaceTabContextMenu
 */

import React, { useEffect, useRef } from 'react';
import { X, Copy, RefreshCw, Layers, ShieldClose } from 'lucide-react';
import { WorkspaceTab } from '../../../core/store/workspaceTabStore';

interface WorkspaceTabContextMenuProps {
  x: number;
  y: number;
  tab: WorkspaceTab;
  isRTL: boolean;
  onClose: () => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseAllTabs: () => void;
  onRefreshTab?: () => void;
}

export const WorkspaceTabContextMenu: React.FC<WorkspaceTabContextMenuProps> = ({
  x,
  y,
  tab,
  isRTL,
  onClose,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onRefreshTab,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند النقر خارجها أو الضغط على Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleCopyLink = () => {
    const url = window.location.origin + window.location.pathname + '#' + tab.path;
    navigator.clipboard.writeText(url).catch(() => {});
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="خيارات التبويب"
      className="animate-in fade-in-50 zoom-in-95 fixed z-[600] min-w-[180px] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-2xl backdrop-blur-xl duration-150"
      style={{
        top: Math.min(y, window.innerHeight - 220),
        left: isRTL ? Math.max(16, x - 180) : Math.min(x, window.innerWidth - 200),
      }}
    >
      <div className="border-[var(--app-border)]/60 mb-1 truncate border-b px-2.5 py-1.5 text-[11px] font-bold text-[var(--app-text-secondary)]">
        {tab.title}
      </div>

      {tab.isClosable && (
        <button
          onClick={() => {
            onCloseTab(tab.id);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10"
        >
          <X size={14} />
          <span>إغلاق هذا التبويب</span>
        </button>
      )}

      <button
        onClick={() => {
          onCloseOtherTabs(tab.id);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
      >
        <Layers size={14} className="text-blue-500" />
        <span>إغلاق التبويبات الأخرى</span>
      </button>

      <button
        onClick={() => {
          onCloseAllTabs();
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
      >
        <ShieldClose size={14} className="text-amber-500" />
        <span>إغلاق كافة التبويبات</span>
      </button>

      <div className="border-[var(--app-border)]/60 my-1 border-t" />

      {onRefreshTab && (
        <button
          onClick={() => {
            onRefreshTab();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
        >
          <RefreshCw size={14} className="text-emerald-500" />
          <span>تحديث التبويب</span>
        </button>
      )}

      <button
        onClick={handleCopyLink}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
      >
        <Copy size={14} className="text-slate-400" />
        <span>نسخ رابط الشاشة</span>
      </button>
    </div>
  );
};
