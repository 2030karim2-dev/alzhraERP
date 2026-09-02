import React from 'react';
import { FileSpreadsheet, RotateCcw, Minimize2, Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '../../core/utils';
import SearchInput from '../../ui/components/SearchInput';

interface ExcelTableToolbarProps {
  title?: string | undefined;
  currentTheme: { accent: string };
  showSearch: boolean;
  internalSearch: string;
  setInternalSearch: (v: string) => void;
  isRTL: boolean;
  onExport?: (() => void) | undefined;
  enableResize: boolean;
  handleResetSize: () => void;
  isZoomed: boolean;
  setIsZoomed: (v: boolean) => void;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
}

const ExcelTableToolbar: React.FC<ExcelTableToolbarProps> = ({
  title,
  currentTheme,
  showSearch,
  internalSearch,
  setInternalSearch,
  isRTL,
  onExport,
  enableResize,
  handleResetSize,
  isZoomed,
  setIsZoomed,
  zoomLevel,
  setZoomLevel,
}) => {
  return (
    <div className="flex flex-col items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] px-1 py-0.5 sm:flex-row">
      <div className="flex w-full items-center gap-3 sm:w-auto">
        {title && (
          <div className="flex items-center gap-2">
            <span className={cn('h-3 w-1 rounded-full', currentTheme.accent)}></span>
            <h3 className="text-[10px] font-bold uppercase tracking-tight text-[var(--app-text-secondary)]">
              {title}
            </h3>
          </div>
        )}
        <div className="flex items-center gap-1 rounded-lg bg-[var(--app-bg)] p-1">
          {enableResize && (
            <>
              <button
                onClick={handleResetSize}
                className="rounded p-1.5 text-[var(--app-text-secondary)] shadow-sm transition-colors hover:bg-[var(--app-surface)] hover:text-blue-500"
                title="إعادة الحجم الأصلي"
              >
                <RotateCcw size={14} />
              </button>
              <div className="mx-0.5 h-4 w-px bg-[var(--app-border)]" />
            </>
          )}
          <button
            onClick={() => {
              setIsZoomed(!isZoomed);
            }}
            className="rounded p-1.5 text-[var(--app-text-secondary)] shadow-sm transition-colors hover:bg-[var(--app-surface)] hover:text-blue-500"
          >
            {isZoomed ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => {
              setZoomLevel(z => Math.max(0.7, z - 0.1));
            }}
            className="rounded p-1 text-[var(--app-text-secondary)] shadow-sm hover:bg-[var(--app-surface)] hover:text-blue-500"
          >
            <Minus size={12} />
          </button>
          <span className="w-8 text-center font-mono text-[10px] font-medium text-[var(--app-text-secondary)]">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => {
              setZoomLevel(z => Math.min(1.5, z + 0.1));
            }}
            className="rounded p-1 text-[var(--app-text-secondary)] shadow-sm hover:bg-[var(--app-surface)] hover:text-blue-500"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-end gap-2 sm:w-auto">
        {showSearch && (
          <div className="relative flex-1 sm:max-w-xs">
            <SearchInput
              value={internalSearch}
              onChange={setInternalSearch}
              placeholder="بحث سريع في النتائج..."
              variant="primary"
              size="sm"
              dir={isRTL ? 'rtl' : 'ltr'}
              clearable
            />
          </div>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-600 shadow-sm transition-all hover:bg-emerald-600 hover:text-white dark:border-emerald-900/30 dark:bg-emerald-950/30"
          >
            <FileSpreadsheet size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ExcelTableToolbar;
