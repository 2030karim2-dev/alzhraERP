import React from 'react';
import { Copy, Clipboard } from 'lucide-react';

interface CellPosition {
    row: number;
    col: number;
}

interface Selection {
    start: CellPosition;
    end: CellPosition;
}

interface ExcelTableStatusBarProps {
    focusedCell: CellPosition | null;
    selection: Selection | null;
    totalRows: number;
    totalCols: number;
    copySelection: () => void;
    pasteCells: () => void;
}

const ExcelTableStatusBar: React.FC<ExcelTableStatusBarProps> = ({
    focusedCell,
    selection,
    totalRows,
    totalCols,
    copySelection,
    pasteCells,
}) => {
    const getStatusText = () => {
        if (!focusedCell) return '';
        const { row, col } = focusedCell;
        return `خلية [${row + 1}, ${col + 1}] من [${totalRows} × ${totalCols}]`;
    };

    return (
        <div className="p-1 px-2 border-t border-[var(--app-border)] bg-[var(--app-bg)] flex flex-col sm:flex-row justify-between items-center gap-1.5 select-none">
            <div className="flex items-center gap-2 text-[10px] text-[var(--app-text-secondary)]">
                <span className="font-mono">{getStatusText()}</span>
                {selection && (
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[9px] font-bold">
                        تحديد: {Math.abs(selection.end.row - selection.start.row) + 1} × {Math.abs(selection.end.col - selection.start.col) + 1}
                    </span>
                )}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1">
                <button
                    onClick={copySelection}
                    className="p-1 text-[var(--app-text-secondary)] hover:text-blue-500 hover:bg-[var(--app-surface-hover)] rounded transition-colors"
                    title="نسخ (Ctrl+C)"
                >
                    <Copy size={12} />
                </button>
                <button
                    onClick={pasteCells}
                    className="p-1 text-[var(--app-text-secondary)] hover:text-blue-500 hover:bg-[var(--app-surface-hover)] rounded transition-colors"
                    title="لصق (Ctrl+V)"
                >
                    <Clipboard size={12} />
                </button>
            </div>
        </div>
    );
};

export default ExcelTableStatusBar;
