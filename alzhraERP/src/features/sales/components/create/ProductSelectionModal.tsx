import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Box, Settings, Eye, EyeOff, Eye as EyeIcon, ArrowUp, ArrowDown, RotateCcw, GitBranch, Globe, PackageCheck, ChevronDown, Plus } from 'lucide-react';
import { useProducts } from '../../../inventory/hooks/index';
import type { Product } from '../../../inventory/types';
import Modal from '../../../../ui/base/Modal';
import { PaginationBar } from '../../../../ui/common/PaginationBar';
import { useProductTableConfig, ColumnConfig } from '../../hooks/useProductTableConfig';
import ProductDetailModal from '../../../inventory/components/ProductDetailModal';
import { useBranchFilterStore } from '../../../branches/store';
import { useBranches } from '../../../settings/hooks';
import { useAuthStore } from '../../../auth/store';
import { useFeedbackStore } from '../../../feedback/store';

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
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);

    // [FIX #8] Keyboard navigation state
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    // [FIX #9] Column sorting state
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // [FIX #4] Client-side pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();
    const isManager = user?.role === 'owner' || user?.role === 'admin';
    const { activeBranchId } = useBranchFilterStore();
    const { data: branches } = useBranches();
    const activeBranches = (branches as BranchData[] | undefined)?.filter(b => b.status === 'active') ?? [];

    // Use the local branch filter for this modal, falling back to global
    const effectiveBranchId = localBranchId ?? activeBranchId;

    const { products: allProducts, isLoading } = useProducts(submittedQuery, { limitNum: 5000, warehouseId: effectiveBranchId || undefined });

    // Modals state for actions
    const [viewProduct, setViewProduct] = useState<Product | null>(null);

    // Filter products
    const filteredProducts = allProducts.filter(p => {
        if (showInStockOnly && p.stock_quantity <= 0) return false;
        return true;
    });

    // [FIX #9] Sort products based on sortConfig
    const products = React.useMemo(() => {
        if (!sortConfig) return filteredProducts;
        const { key, direction } = sortConfig;
        const sorted = [...filteredProducts].sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';
            
            // Map column key to product field
            switch (key) {
                case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
                case 'part_number': aVal = a.part_number || ''; bVal = b.part_number || ''; break;
                case 'brand': aVal = a.brand || ''; bVal = b.brand || ''; break;
                case 'stock': {
                    const aQty = a.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity ?? a.stock_quantity;
                    const bQty = b.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity ?? b.stock_quantity;
                    aVal = aQty; bVal = bQty; break;
                }
                case 'price': aVal = (a.selling_price || a.sale_price) ?? 0; bVal = (b.selling_price || b.sale_price) ?? 0; break;
                case 'size': aVal = a.size || ''; bVal = b.size || ''; break;
                default: return 0;
            }
            
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const strA = String(aVal).toLowerCase();
            const strB = String(bVal).toLowerCase();
            if (strA < strB) return direction === 'asc' ? -1 : 1;
            if (strA > strB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredProducts, sortConfig, effectiveBranchId]);

    // [FIX #9] Handle column header click for sorting
    const handleSort = (colId: string) => {
        // Don't sort index or actions columns
        if (colId === 'index' || colId === 'actions' || colId === 'branch' || colId === 'specs') return;
        setSortConfig(prev => {
            if (prev?.key === colId) {
                return { key: colId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key: colId, direction: 'asc' };
        });
    };

    // [FIX #4] Pagination logic
    const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
    const safePage = Math.min(page, totalPages);
    
    // Reset to page 1 when filters/sort change
    React.useEffect(() => {
        setPage(1);
    }, [submittedQuery, showInStockOnly, sortConfig, effectiveBranchId]);
    
    const paginatedProducts = React.useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return products.slice(start, start + pageSize);
    }, [products, safePage, pageSize]);
    
    const handlePageChange = (newPage: number) => {
        setPage(Math.max(1, Math.min(totalPages, newPage)));
        setFocusedIndex(-1); // Reset keyboard focus
    };

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
            
            // [FIX #5] التحقق من توفر المخزون قبل الإضافة
            const branchQty = p.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity;
            const effectiveQty = branchQty ?? p.stock_quantity;
            if (effectiveQty <= 0) {
                showToast(`المنتج "${p.name}" غير متوفر في المخزون حالياً`, 'warning');
                return;
            }
            
            onSelect(p);
        }
    };

    // [FIX #8] Keyboard navigation: Arrow Up/Down + Enter for selection
    const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => {
                const max = paginatedProducts.length - 1;
                if (max < 0) return -1;
                if (prev < 0) return 0;
                const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
                return Math.max(0, Math.min(max, next));
            });
        } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < paginatedProducts.length) {
            e.preventDefault();
            const product = paginatedProducts[focusedIndex];
            if (product) {
                const branchQty = product.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId)?.quantity;
                const effectiveQty = branchQty ?? product.stock_quantity;
                if (effectiveQty <= 0) {
                    showToast(`المنتج "${product.name}" غير متوفر في المخزون حالياً`, 'warning');
                    return;
                }
                onSelect(product);
            }
        }
    }, [paginatedProducts, focusedIndex, effectiveBranchId, showToast, onSelect]);

    // Scroll focused row into view when focusedIndex changes
    useEffect(() => {
        if (focusedIndex >= 0 && tableBodyRef.current) {
            const row = tableBodyRef.current.children[focusedIndex] as HTMLElement | undefined;
            row?.scrollIntoView({ block: 'nearest' });
        }
    }, [focusedIndex]);

    // Reset keyboard focus when products change or modal opens/closes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [products, isOpen]);

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
                        onClick={(e) => { e.stopPropagation(); onSelect(p); }}
                        className="p-1 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 transition-colors"
                        title="إضافة مباشرة بنقرة واحدة"
                    >
                        <Plus size={12} />
                    </button>
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
                    <div 
                        className="flex-1 overflow-auto custom-scrollbar outline-none"
                        onKeyDown={handleTableKeyDown}
                        tabIndex={0}
                        role="grid"
                        aria-label="قائمة المنتجات"
                    >
                        <table className="w-full border-collapse border-spacing-0 table-fixed min-w-max">
                            <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm border-b-2 border-gray-300 dark:border-slate-600">
                                <tr className={`${headerFontSizeClasses[config.fontSize]} font-extrabold text-gray-600 dark:text-slate-300 uppercase tracking-tighter text-right`}>
                                    {visibleColumns.map((col) => {
                                        const isSortable = !['index', 'actions', 'branch', 'specs'].includes(col.id);
                                        const isSorted = sortConfig?.key === col.id;
                                        return (
                                        <th
                                            key={col.id}
                                            style={{ width: col.width }}
                                            onClick={() => handleSort(col.id)}
                                            className={`relative border-l border-gray-300 dark:border-slate-600 p-2 bg-gray-100 dark:bg-slate-800/80 last:border-l-0 select-none ${col.id === 'index' || col.id === 'stock' || col.id === 'actions' ? 'text-center' : 'pr-4'} ${isSortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700' : ''}`}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {col.label}
                                                {isSorted && (
                                                    <span className="text-blue-500">
                                                        {sortConfig!.direction === 'asc' ? '▲' : '▼'}
                                                    </span>
                                                )}
                                            </span>
                                            {col.id !== 'index' && (
                                                <div
                                                    onMouseDown={(e) => onMouseDown(e, col.id, col.width)}
                                                    className="absolute left-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-500/40 transition-colors z-30 -ml-1"
                                                />
                                            )}
                                        </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody ref={tableBodyRef} className="divide-y divide-gray-200 dark:divide-slate-700">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={visibleColumns.length} className="p-10 text-center animate-pulse text-[10px] font-bold text-gray-400">
                                            جاري تحميل المنتجات...
                                        </td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleColumns.length} className="p-10 text-center text-gray-300 text-sm">
                                            لا توجد نتائج مطابقة
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProducts.map((p, idx) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => handleRowClick(p)}
                                            onMouseEnter={() => setFocusedIndex(idx)}
                                            title="انقر مرتين أو اضغط Enter لإضافة المنتج للفاتورة"
                                            className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer group transition-colors outline-none ${fontSizeClasses[config.fontSize]} ${focusedIndex === idx ? 'bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-400 dark:ring-blue-500' : ''}`}
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

                    {/* Status bar with pagination */}
                    <PaginationBar
                        page={safePage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalResults={products.length}
                        onPageChange={handlePageChange}
                        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                        extraInfo={<>
                            {showInStockOnly && <span className="text-emerald-500">• عرض المتوفر فقط</span>}
                            {effectiveBranchId !== null && <span className="text-indigo-500">• {selectedBranchName}</span>}
                        </>}
                    />
                </div>
            </Modal>
        </>
    );
};

export default ProductSelectionModal;