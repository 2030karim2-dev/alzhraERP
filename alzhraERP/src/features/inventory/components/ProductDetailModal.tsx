import React, { useState, useEffect, useCallback } from 'react';
import { X, Box, FileText, Maximize2, Minimize2, Trash2, ExternalLink, Printer } from 'lucide-react';
import { Product } from '../types';
import StockStatusBadge from './product_detail/StockStatusBadge';
import ProductDetailsContent from './product_detail/ProductDetailsContent';
import { cn } from '../../../core/utils';

interface Props {
    product: Product | null;
    onClose: () => void;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string) => void;
}

const ProductDetailModal: React.FC<Props> = ({ product, onClose, onEdit, onDelete }) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Keyboard shortcuts: Escape to close, arrows for next/prev tabs
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose();
    }, []);

    useEffect(() => {
        // Add body scroll lock
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    if (!product) return null;

    return (
        <div
            onClick={handleClose}
            className={cn(
                "fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300",
                isClosing ? 'bg-slate-900/0' : 'bg-slate-900/60 backdrop-blur-sm'
            )}
            style={{ animation: isClosing ? 'none' : undefined }}
        >
            <div
                onClick={e => e.stopPropagation()}
                className={cn(
                    "bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col border transition-all duration-300 shadow-2xl overflow-hidden",
                    isMaximized
                        ? "w-full h-full rounded-none border-0"
                        : "w-full max-w-3xl max-h-[90vh] rounded-2xl border border-slate-200/80 dark:border-slate-800/80",
                    isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                )}
            >
                {/* Glass Header */}
                <div className="flex justify-between items-center px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shrink-0 relative z-20">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Box size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate uppercase tracking-wide">
                                    {product.name}
                                </h2>
                                <div className="scale-90 origin-right">
                                    <StockStatusBadge quantity={product.stock_quantity} minLevel={product.min_stock_level} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                    <span className="opacity-60 uppercase">SKU</span>
                                    <span dir="ltr" className="font-mono text-slate-700 dark:text-slate-300">{product.sku}</span>
                                </span>
                                {product.part_number && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                            <span className="opacity-60 uppercase">Part #</span>
                                            <span dir="ltr" className="font-mono text-indigo-600 dark:text-indigo-400">{product.part_number}</span>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {onEdit && (
                            <button
                                onClick={() => { onEdit(product); onClose(); }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-95"
                                title="تعديل"
                            >
                                <FileText size={14} strokeWidth={2.5} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => { if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) { onDelete(product.id); onClose(); } }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all active:scale-95"
                                title="حذف"
                            >
                                <Trash2 size={14} strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Quick Actions */}
                        <button
                            onClick={() => window.print()}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all active:scale-95 hidden md:flex"
                            title="طباعة"
                        >
                            <Printer size={14} strokeWidth={2} />
                        </button>
                        <button
                            onClick={() => {
                                const text = `${product.name}\nSKU: ${product.sku}\nالسعر: ${product.sale_price} YER`;
                                navigator.clipboard?.writeText(text);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all active:scale-95 hidden md:flex"
                            title="نسخ المعلومات"
                        >
                            <ExternalLink size={14} strokeWidth={2} />
                        </button>

                        <span className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />

                        <button
                            type="button"
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg bg-transparent transition-all active:scale-95"
                            title={isMaximized ? "تصغير" : "تكبير"}
                        >
                            {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg bg-transparent transition-all active:scale-95 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950">
                    <ProductDetailsContent product={product} />
                </div>

                {/* Keyboard shortcut hint */}
                <div className="absolute bottom-3 left-3 bg-slate-900/80 dark:bg-slate-100/80 text-white dark:text-slate-900 text-[8px] font-bold px-2 py-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    ESC لإغلاق
                </div>
            </div>
        </div>
    );
};

export default ProductDetailModal;