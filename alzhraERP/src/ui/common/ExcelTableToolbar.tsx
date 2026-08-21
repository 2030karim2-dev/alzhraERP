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
        <div className="flex flex-col sm:flex-row justify-between items-center px-1 py-0.5 border-b border-[var(--app-border)] bg-[var(--app-surface-hover)]">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                {title && (
                    <div className="flex items-center gap-2">
                        <span className={cn("w-1 h-3 rounded-full", currentTheme.accent)}></span>
                        <h3 className="text-[10px] font-bold text-[var(--app-text-secondary)] uppercase tracking-tight">{title}</h3>
                    </div>
                )}
                <div className="flex items-center gap-1 bg-[var(--app-bg)] p-1 rounded-lg">
                    {enableResize && (
                        <>
                            <button
                                onClick={handleResetSize}
                                className="p-1.5 text-[var(--app-text-secondary)] hover:text-blue-500 transition-colors rounded hover:bg-[var(--app-surface)] shadow-sm"
                                title="إعادة الحجم الأصلي"
                            >
                                <RotateCcw size={14} />
                            </button>
                            <div className="w-px h-4 bg-[var(--app-border)] mx-0.5" />
                        </>
                    )}
                    <button onClick={() => setIsZoomed(!isZoomed)} className="p-1.5 text-[var(--app-text-secondary)] hover:text-blue-500 transition-colors rounded hover:bg-[var(--app-surface)] shadow-sm">
                        {isZoomed ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))} className="p-1 text-[var(--app-text-secondary)] hover:text-blue-500 rounded hover:bg-[var(--app-surface)] shadow-sm"><Minus size={12} /></button>
                    <span className="text-[10px] w-8 text-center font-mono font-medium text-[var(--app-text-secondary)]">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="p-1 text-[var(--app-text-secondary)] hover:text-blue-500 rounded hover:bg-[var(--app-surface)] shadow-sm"><Plus size={12} /></button>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 justify-end">
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
                    <button onClick={onExport} className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-600 hover:text-white transition-all rounded-lg shadow-sm">
                        <FileSpreadsheet size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ExcelTableToolbar;
