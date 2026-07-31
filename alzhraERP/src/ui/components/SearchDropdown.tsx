import React, { useRef, useEffect } from 'react';
import { Loader2, Box } from 'lucide-react';
import { cn } from '../../core/utils';

export interface SearchDropdownProps {
    open: boolean;
    onClose: () => void;
    loading?: boolean;
    emptyMessage?: string;
    hasResults?: boolean;
    children: React.ReactNode;
    className?: string;
    /** Ref to the trigger element; click outside of both trigger and dropdown will close */
    triggerRef?: React.RefObject<HTMLElement | null>;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({
    open,
    onClose,
    loading = false,
    emptyMessage = 'لا توجد نتائج مطابقة',
    hasResults = false,
    children,
    className,
    triggerRef,
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click-outside handler
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const dropdownEl = dropdownRef.current;
            const triggerEl = triggerRef?.current;

            if (
                dropdownEl &&
                !dropdownEl.contains(target) &&
                (!triggerEl || !triggerEl.contains(target))
            ) {
                onClose();
            }
        };

        // Escape key handler
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose, triggerRef]);

    if (!open) return null;

    return (
        <div
            ref={dropdownRef}
            className={cn(
                'absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 shadow-2xl border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200',
                className
            )}
        >
            {loading && (
                <div className="p-6 text-center bg-slate-50/50 dark:bg-slate-800/50">
                    <Loader2 size={24} className="animate-spin inline-block text-blue-500 mb-2" />
                    <div className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                        جاري البحث...
                    </div>
                </div>
            )}

            {!loading && !hasResults && (
                <div className="p-8 text-center bg-gray-50 dark:bg-slate-950">
                    <Box size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold text-gray-400">{emptyMessage}</p>
                </div>
            )}

            {!loading && hasResults && children}
        </div>
    );
};

export default SearchDropdown;
