import React from 'react';
import { FileSpreadsheet, Keyboard, RotateCcw, Minimize2, Maximize2, Minus, Plus } from 'lucide-react';
import { cn } from '../../core/utils';
import { TABLE_SHORTCUTS } from './useTableKeyboardNavigation';
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
    showShortcuts: boolean;
    setShowShortcuts: (v: boolean) => void;
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
    showShortcuts,
    setShowShortcuts,
}) => {
    const getShortcutIcon = (key: string) => {
        switch (key) {
            case 'ArrowUp': return '↑';
            case 'ArrowDown': return '↓';
            case 'ArrowLeft': return '←';
            case 'ArrowRight': return '→';
            case 'Home': return '⇤';
            case 'End': return '⇥';
            case 'Delete': return '⌫';
            case 'c':
            case 'Copy': return '⎘';
            case 'v':
            case 'Paste': return '📋';
            default: return key;
        }
    };

    return (
        <>
            {/* Table Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center px-1 py-0.5 border-b border-[var(--app-border)] bg-gray-50/50 dark:bg-slate-900/50">
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
                    {/* Keyboard shortcuts toggle */}
                    <button
                        onClick={() => setShowShortcuts(!showShortcuts)}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            showShortcuts ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-[var(--app-text-secondary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        )}
                        title="اختصارات لوحة المفاتيح"
                    >
                        <Keyboard size={14} />
                    </button>
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

            {/* Keyboard Shortcuts Panel */}
            {showShortcuts && (
                <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-3 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Keyboard size={14} className="text-blue-600" />
                        <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">اختصارات لوحة المفاتيح</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TABLE_SHORTCUTS.map((shortcut, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[9px]">
                                <kbd className="px-1.5 py-0.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded text-[9px] font-mono font-medium text-[var(--app-text)] flex items-center gap-0.5 min-w-[45px] justify-center">
                                    {shortcut.modifier && <span className="text-[7px]">{shortcut.modifier === 'ctrl' ? 'Ctrl' : shortcut.modifier === 'shift' ? '⇧' : 'Alt'}</span>}
                                    {getShortcutIcon(shortcut.key)}
                                </kbd>
                                <span className="text-[var(--app-text-secondary)]">{isRTL ? shortcut.descriptionAr : shortcut.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

export default ExcelTableToolbar;
