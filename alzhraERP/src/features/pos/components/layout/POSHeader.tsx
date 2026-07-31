import React, { useRef } from 'react';
import { Store, PauseCircle, Home, Zap, RotateCcw, Layers, ScanBarcode, Building2, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../core/utils';
import MicroHeader from '../../../../ui/base/MicroHeader';
import SearchInput from '../../../../ui/components/SearchInput';
import POSSearchDropdown from '../POSSearchDropdown';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { useBreakpoint } from '../../../../lib/hooks/useBreakpoint';

interface POSHeaderProps {
    search: any;
    inStockOnly: boolean;
    setInStockOnly: (value: boolean) => void;
    isQuickMode: boolean;
    setIsQuickMode: (value: boolean) => void;
    suspendedOrdersCount: number;
    showSuspended: boolean;
    setShowSuspended: (value: boolean) => void;
    onClearCart: () => void;
    onLaunchScanner: () => void;
    onSearchSelect: (result: any) => void;
    onViewDetails: (result: any) => void;
    warehouses: any[];
    selectedWarehouseId: string | null;
    onWarehouseChange: (warehouseId: string | null) => void;
}

export const POSHeader: React.FC<POSHeaderProps> = React.memo(({
    search,
    inStockOnly,
    setInStockOnly,
    isQuickMode,
    setIsQuickMode,
    suspendedOrdersCount,
    showSuspended,
    setShowSuspended,
    onClearCart,
    onLaunchScanner,
    onSearchSelect,
    onViewDetails,
    warehouses,
    selectedWarehouseId,
    onWarehouseChange,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isDesktop = useBreakpoint('md');
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [showWarehouseDropdown, setShowWarehouseDropdown] = React.useState(false);
    const warehouseDropdownRef = useRef<HTMLDivElement>(null);

    const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

    // Close warehouse dropdown on outside click
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (warehouseDropdownRef.current && !warehouseDropdownRef.current.contains(e.target as Node)) {
                setShowWarehouseDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const actions = (
        <div className="flex gap-1.5">
            <button
                onClick={() => setShowSuspended(!showSuspended)}
                className="relative p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl hover:bg-amber-100 active:scale-95 transition-all border border-amber-100 dark:border-amber-900/30"
                title={t('suspended_orders')}
            >
                <PauseCircle size={18} />
                {suspendedOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg">
                        {suspendedOrdersCount}
                    </span>
                )}
            </button>
            <button
                onClick={() => navigate('/')}
                className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 active:scale-95 transition-all border border-slate-100 dark:border-slate-800"
                title="الرجوع للرئيسية"
            >
                <Home size={18} />
            </button>
            <button
                onClick={() => setIsQuickMode(!isQuickMode)}
                className={`p-2 rounded-xl active:scale-95 transition-all border ${isQuickMode ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border-slate-100 dark:border-slate-800'}`}
                title="الوضع السريع"
            >
                <Zap size={18} />
            </button>
            <button
                onClick={onClearCart}
                className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl hover:bg-rose-100 active:scale-95 transition-all border border-rose-100 dark:border-rose-900/30"
                title={t('clear_cart')}
            >
                <RotateCcw size={18} />
            </button>
        </div>
    );

    return (
        <MicroHeader
            title={t('pos_title')}
            icon={Store}
            iconColor="text-blue-600"
            actions={actions}
            searchWidth="w-full flex-1"
            extraRow={
                <div className="flex items-center gap-2 w-full max-w-[800px]">
                    {/* Warehouse Selector */}
                    <div ref={warehouseDropdownRef} className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
                            className={`
                                flex items-center justify-center gap-1.5 px-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all active:scale-95 border-2 h-[34px] md:h-[38px] shrink-0
                                ${selectedWarehouseId
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }
                            `}
                        >
                            <Building2 size={14} />
                            <span className="hidden sm:inline max-w-[100px] truncate">
                                {selectedWarehouse ? selectedWarehouse.name_ar : 'الكل'}
                            </span>
                            <ChevronDown size={12} />
                        </button>

                        {showWarehouseDropdown && (
                            <div className="absolute top-full mt-1 right-0 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                                    <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                        اختر المستودع
                                    </h4>
                                </div>
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onWarehouseChange(null);
                                            setShowWarehouseDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 text-right text-[11px] font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30",
                                            !selectedWarehouseId ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300'
                                        )}
                                    >
                                        <span>جميع المستودعات</span>
                                        {!selectedWarehouseId && <Building2 size={14} className="text-indigo-500" />}
                                    </button>
                                    {warehouses.map((wh) => (
                                        <button
                                            key={wh.id}
                                            type="button"
                                            onClick={() => {
                                                onWarehouseChange(wh.id);
                                                setShowWarehouseDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 text-right text-[11px] font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30",
                                                selectedWarehouseId === wh.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300'
                                            )}
                                        >
                                            <div className="flex flex-col">
                                                <span>{wh.name_ar}</span>
                                                {wh.branches?.name && (
                                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">{wh.branches.name}</span>
                                                )}
                                            </div>
                                            {selectedWarehouseId === wh.id && <Building2 size={14} className="text-indigo-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div ref={searchContainerRef} className="relative flex-1 w-full min-w-0">
                        <SearchInput
                            value={search.query}
                            onChange={search.setQuery}
                            placeholder="اسم الصنف، SKU، أو امسح الباركود (CTRL+B)..."
                            loading={search.isLoading}
                            variant="primary"
                            size={isDesktop ? 'md' : 'sm'}
                            className="w-full"
                            onKeyDown={search.onKeyDown}
                            onEscape={search.closeDropdown}
                        />
                        <POSSearchDropdown
                            open={search.showDropdown}
                            onClose={search.closeDropdown}
                            results={search.results}
                            loading={search.isLoading}
                            query={search.query}
                            isShowingPopular={search.isShowingPopular}
                            selectedIndex={search.selectedIndex}
                            sortMode={search.sortMode}
                            onSortChange={search.setSortMode}
                            onSelect={onSearchSelect}
                            onViewDetails={onViewDetails}
                            triggerRef={searchContainerRef as React.RefObject<HTMLElement>}
                            total={search.total}
                            searchTimeMs={search.searchTimeMs}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setInStockOnly(!inStockOnly)}
                        className={`
                flex items-center justify-center gap-1.5 px-3 rounded-xl text-[10px] md:text-xs font-black transition-all active:scale-95 border-2 h-[34px] md:h-[38px] shrink-0
                ${inStockOnly
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }
              `}
                    >
                        <Layers size={14} className={inStockOnly ? 'animate-pulse' : ''} />
                        <span className="hidden sm:inline">متوفر فقط</span>
                    </button>

                    {!isQuickMode && (
                        <button
                            type="button"
                            onClick={onLaunchScanner}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-[34px] md:h-[38px] rounded-xl shadow-xl shadow-blue-500/10 active:scale-[0.98] transition-all font-bold text-[10px] md:text-xs uppercase tracking-wider px-3 shrink-0"
                        >
                            <ScanBarcode size={14} />
                            <span className="hidden sm:inline">{t('launch_scanner')}</span>
                        </button>
                    )}
                </div>
            }
        />
    );
});

POSHeader.displayName = 'POSHeader';