import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Box, Settings, Eye, EyeOff, Eye as EyeIcon, ArrowUp, ArrowDown, RotateCcw, GitBranch, Globe, PackageCheck, ChevronDown } from 'lucide-react';
import { useProducts } from '../../../inventory/hooks/index';
import type { Product } from '../../../inventory/types';
import Modal from '../../../../ui/base/Modal';
import { useProductTableConfig, ColumnConfig } from '../../hooks/useProductTableConfig';
import ProductDetailModal from '../../../inventory/components/ProductDetailModal';
import { useBranchFilterStore } from '../../../branches/store';
import { useBranches } from '../../../settings/hooks';
import { useAuthStore } from '../../../auth/store';

interface BranchData {
    id: string;
    name: string;
    status: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: Product) => void;
    initialQuery?: string;
    mode?: 'sale' | 'purchase';
}

const ProductSelectionModal: React.FC<Props> = ({ isOpen, onClose, onSelect, initialQuery = '', mode = 'sale' }) => {
    const [localQuery, setLocalQuery] = useState(initialQuery);
    const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
    const [showInStockOnly, setShowInStockOnly] = useState(false);
    const [localBranchId, setLocalBranchId] = useState<string | null>(null);
    const [showBranchMenu, setShowBranchMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const branchMenuRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    const { user } = useAuthStore();
    const isManager = user?.role === 'owner' || user?.role === 'admin';
    const { activeBranchId } = useBranchFilterStore();
    const { data: branches } = useBranches();
    const activeBranches = (branches as BranchData[] | undefined)?.filter(b => b.status === 'active') ?? [];

    // Use the local branch filter for this modal, falling back to global
    const effectiveBranchId = localBranchId ?? activeBranchId;

    const { products: allProducts, isLoading } = useProducts(submittedQuery, { limitNum: 5000 });

    // Modals state for actions
    const [viewProduct, setViewProduct] = useState<Product | null>(null);

    // Filter products
    const products = allProducts.filter(p => {
        if (showInStockOnly && p.stock_quantity <= 0) return false;
        return true;
    });

    const {
        config,
        setColumnWidth,
        toggleColumnVisibility,
        reorderColumn,
        setFontSize,
        resetConfig
    } = useProductTableConfig();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
                setShowBranchMenu(false);
            }
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Reset local query when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalQuery(initialQuery);
            setSubmittedQuery(initialQuery);
        }
    }, [isOpen, initialQuery]);

    // --- Column Resizing Logic ---
    const resizingRef = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

    const onMouseDown = (e: React.MouseEvent, id: string, currentWidth: number) => {
        resizingRef.current = { id, startX: e.pageX, startWidth: currentWidth };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { id, startX, startWidth } = resizingRef.current;
        const delta = e.pageX - startX;
        const newWidth = Math.max(30, startWidth + (document.dir === 'rtl' ? -delta : delta));
        setColumnWidth(id, newWidth);
    }, [setColumnWidth]);

    const onMouseUp = useCallback(() => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [onMouseMove]);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setSubmittedQuery(localQuery);
        }
    };

    const fontSizeClasses = { small: 'text-[9px]', medium: 'text-[11px]', large: 'text-[13px]' };
    const headerFontSizeClasses = { small: 'text-[9px]', medium: 'text-[10px]', large: 'text-[12px]' };

    const moveColumnUp = (index: number) => { if (index > 0) reorderColumn(index, index - 1); };
    const moveColumnDown = (index: number) => { if (index < config.columns.length - 1) reorderColumn(index, index + 1); };

    const visibleColumns = config.columns.filter(c => c.visible);

    // Track double-click state
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clickCountRef = useRef<Record<string, number>>({});

    const handleRowClick = (p: Product) => {
        const id = p.id;
        clickCountRef.current[id] = (clickCountRef.current[id] ?? 0) + 1;

        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

        clickTimerRef.current = setTimeout(() => {
            clickCountRef.current[id] = 0;
        }, 300);

        if (clickCountRef.current[id] >= 2) {
            clickCountRef.current[id] = 0;
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            onSelect(p);
        }
    };

    const renderCellContent = (col: ColumnConfig, p: Product, idx: number) => {
        switch (col.id) {
            case 'index': return <span className="opacity-50 font-mono">{idx + 1}</span>;
            case 'name': return <span className="font-bold truncate block">{p.name}</span>;
            case 'part_number': return <span className="font-mono font-bold text-gray-700 dark:text-gray-300 truncate block" dir="ltr">{p.part_number || p.alternative_numbers || '---'}</span>;
            case 'brand': return <span className="font-bold opacity-60 truncate block">{p.brand || '---'}</span>;
            case 'branch': {
                const branchStock = p.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId) || p.warehouse_distribution?.[0];
                return <span className="truncate block opacity-80 text-xs">{branchStock?.warehouse_name || 'الرئيسي'}</span>;
            }
            case 'stock': {
                const qty = p.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity ?? p.stock_quantity;
                const isLow = qty <= p.min_stock_level;
                return <span className={`font-black font-mono ${isLow ? 'text-red-500' : ''}`}>{qty}</span>;
            }
            case 'price': return (
                <span className="font-black font-mono text-emerald-600 group-hover:text-white">
                    {mode === 'sale' ? (p.selling_price || p.sale_price) : p.cost_price}
                </span>
            );
            case 'size': return <span className="opacity-70 truncate block">{p.size || '---'}</span>;
            case 'specs': return <span className="opacity-70 truncate block" title={p.specifications || ''}>{p.specifications || '---'}</span>;
            case 'actions': return (
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewProduct(p); }}
                        className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                        title="معاينة التفاصيل"
                    >
                        <EyeIcon size={12} />
                    </button>
                </div>
            );
            default: return null;
        }
    };

    const selectedBranchName = localBranchId !== null
        ? activeBranches.find(b => b.id === localBranchId)?.name ?? 'فرع محدد'
        : (activeBranchId !== null ? activeBranches.find(b => b.id === activeBranchId)?.name : 'جميع الفروع');

    return (
        <>
            {/* Product Detail Viewer Modal */}
            {viewProduct && (
                <ProductDetailModal
                    product={viewProduct}
                    onClose={() => setViewProduct(null)}
                />
            )}

            <Modal
                isOpen={isOpen}
                onClose={onClose}
                icon={Box}
                size="full"
                title="مستكشف الأصناف المتقدم"
                description="انقر مرتين على المنتج لإضافته للفاتورة"
                footer={
                    <div className="w-full flex items-center justify-between gap-2">
                        <span className="text-[9px] text-gray-400 font-mono">{products.length} منتج</span>
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-[10px] font-bold bg-gray-100 dark:bg-slate-800 uppercase hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors rounded">إغلاق</button>
                    </div>
                }
            >
                <div className="flex flex-col h-[70vh] bg-white dark:bg-slate-900">
                    {/* Toolbar */}
                    <div className="p-2 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-2 items-center">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                autoFocus
                                type="text"
                                value={localQuery}
                                onChange={(e) => setLocalQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="ابحث بالاسم، رقم القطعة... (اضغط Enter)"
                                className="w-full pr-9 pl-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none rounded-lg text-sm font-medium"
                            />
                        </div>

                        {/* Filter: In Stock Only */}
                        <button
                            type="button"
                            onClick={() => setShowInStockOnly(!showInStockOnly)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${showInStockOnly ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:border-emerald-400 hover:text-emerald-600'}`}
                        >
                            <PackageCheck size={14} />
                            متوفر فقط
                        </button>

                        {/* Filter: Branch selector (managers only) */}
                        {isManager && (
                            <div className="relative" ref={branchMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowBranchMenu(!showBranchMenu)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${localBranchId !== null ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:border-indigo-400'}`}
                                >
                                    {localBranchId !== null ? <GitBranch size={14} /> : <Globe size={14} />}
                                    <span className="max-w-[100px] truncate">{selectedBranchName}</span>
                                    <ChevronDown size={11} className={`transition-transform ${showBranchMenu ? 'rotate-180' : ''}`} />
                                </button>
                                {showBranchMenu && (
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-[200] overflow-hidden">
                                        <button type="button" onClick={() => { setLocalBranchId(null); setShowBranchMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-right transition-colors ${localBranchId === null ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                                            <Globe size={13} /> جميع الفروع
                                        </button>
                                        {activeBranches.map(branch => (
                                            <button key={branch.id} type="button" onClick={() => { setLocalBranchId(branch.id); setShowBranchMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-right transition-colors ${localBranchId === branch.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                                                <GitBranch size={13} /> {branch.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Settings Gear */}
                        <div className="relative" ref={settingsRef}>
                            <button
                                type="button"
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:border-blue-500' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:border-blue-400 hover:text-blue-600'}`}
                                title="إعدادات الجدول"
                            >
                                <Settings size={16} />
                            </button>

                            {/* Settings Popover — isolated from any click propagation */}
                            {showSettings && (
                                <div
                                    className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-2xl z-[200] p-4"
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-slate-700">
                                        <h3 className="font-bold text-sm">إعدادات الجدول</h3>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={() => { resetConfig(); }}
                                            className="text-[10px] flex items-center gap-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            <RotateCcw size={10} /> استعادة الافتراضي
                                        </button>
                                    </div>

                                    {/* Font Size */}
                                    <div className="mb-4">
                                        <label className="text-xs font-bold text-gray-500 mb-2 block">حجم الخط</label>
                                        <div className="flex gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
                                            {(['small', 'medium', 'large'] as const).map(sz => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={() => setFontSize(sz)}
                                                    className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${config.fontSize === sz ? 'bg-white dark:bg-slate-700 shadow font-bold text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
                                                >
                                                    {sz === 'small' ? 'صغير' : sz === 'medium' ? 'متوسط' : 'كبير'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Column Manager */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-2 block">إدارة الأعمدة</label>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar border dark:border-slate-700 rounded-xl divide-y dark:divide-slate-700">
                                            {config.columns.map((col, index) => (
                                                <div key={col.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={() => toggleColumnVisibility(col.id)}
                                                            className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded"
                                                        >
                                                            {col.visible ? <Eye size={13} className="text-blue-500" /> : <EyeOff size={13} />}
                                                        </button>
                                                        <span className={`text-xs ${!col.visible ? 'line-through opacity-40' : ''}`}>{col.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={() => moveColumnUp(index)}
                                                            disabled={index === 0}
                                                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 disabled:opacity-20 transition-colors rounded"
                                                        >
                                                            <ArrowUp size={11} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                            onClick={() => moveColumnDown(index)}
                                                            disabled={index === config.columns.length - 1}
                                                            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-300 disabled:opacity-20 transition-colors rounded"
                                                        >
                                                            <ArrowDown size={11} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full border-collapse border-spacing-0 table-fixed min-w-max">
                            <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm border-b-2 border-gray-300 dark:border-slate-600">
                                <tr className={`${headerFontSizeClasses[config.fontSize]} font-extrabold text-gray-600 dark:text-slate-300 uppercase tracking-tighter text-right`}>
                                    {visibleColumns.map((col) => (
                                        <th
                                            key={col.id}
                                            style={{ width: col.width }}
                                            className={`relative border-l border-gray-300 dark:border-slate-600 p-2 bg-gray-100 dark:bg-slate-800/80 last:border-l-0 select-none ${col.id === 'index' || col.id === 'stock' || col.id === 'actions' ? 'text-center' : 'pr-4'}`}
                                        >
                                            <span>{col.label}</span>
                                            {col.id !== 'index' && (
                                                <div
                                                    onMouseDown={(e) => onMouseDown(e, col.id, col.width)}
                                                    className="absolute left-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-500/40 transition-colors z-30 -ml-1"
                                                />
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={visibleColumns.length} className="p-10 text-center animate-pulse text-[10px] font-bold text-gray-400">
                                            جاري مسح قاعدة البيانات...
                                        </td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleColumns.length} className="p-10 text-center text-gray-300 text-sm">
                                            لا توجد نتائج مطابقة
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((p, idx) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => handleRowClick(p)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { onSelect(p); } }}
                                            tabIndex={0}
                                            title="انقر مرتين لإضافة المنتج للفاتورة"
                                            className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer group transition-colors focus:bg-blue-100 dark:focus:bg-blue-900/30 outline-none ${fontSizeClasses[config.fontSize]}`}
                                        >
                                            {visibleColumns.map(col => (
                                                <td
                                                    key={`${p.id}-${col.id}`}
                                                    className={`border-l border-gray-200 dark:border-slate-700 px-2 py-1.5 last:border-l-0 ${col.id === 'index' || col.id === 'stock' || col.id === 'actions' ? 'text-center' : ''}`}
                                                >
                                                    {renderCellContent(col, p, idx)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Status bar */}
                    <div className="px-3 py-1 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>{products.length} نتيجة</span>
                        {showInStockOnly && <span className="text-emerald-500">• عرض المتوفر فقط</span>}
                        {effectiveBranchId !== null && <span className="text-indigo-500">• {selectedBranchName}</span>}
                        <span className="mr-auto opacity-60">انقر مرتين لإضافة المنتج</span>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ProductSelectionModal;