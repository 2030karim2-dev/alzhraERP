import React from 'react';

interface PaginationBarProps {
    page: number;
    totalPages: number;
    pageSize: number;
    totalResults: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    extraInfo?: React.ReactNode;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
    page, totalPages, pageSize, totalResults,
    onPageChange, onPageSizeChange, extraInfo
}) => {
    const safePage = Math.max(1, Math.min(page, totalPages || 1));
    return (
        <div className="px-3 py-1.5 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>{totalResults} نتيجة</span>
            {extraInfo}
            <div className="flex items-center gap-1 ml-4">
                <span className="opacity-60">عرض:</span>
                {[25, 50, 100].map(size => (
                    <button key={size} onClick={() => { onPageSizeChange(size); }}
                        className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${pageSize === size ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-slate-800'}`}>
                        {size}
                    </button>
                ))}
            </div>
            <div className="mr-auto flex items-center gap-1">
                <button onClick={() => onPageChange(1)} disabled={safePage <= 1}
                    className="px-1 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">««</button>
                <button onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1}
                    className="px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
                <span className="px-1 text-[10px] font-mono">{safePage} / {totalPages}</span>
                <button onClick={() => onPageChange(safePage + 1)} disabled={safePage >= totalPages}
                    className="px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
                <button onClick={() => onPageChange(totalPages)} disabled={safePage >= totalPages}
                    className="px-1 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">»»</button>
            </div>
            <span className="opacity-60">انقر مرتين أو Enter للإضافة</span>
        </div>
    );
};
