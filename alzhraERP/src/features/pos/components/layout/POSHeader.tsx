import React, { useRef } from 'react';
import {
  Store,
  PauseCircle,
  Home,
  Zap,
  RotateCcw,
  Layers,
  ScanBarcode,
  Building2,
  ChevronDown,
  Scale,
  Coffee,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../../core/utils';
import { ROUTES } from '../../../../core/routes/paths';
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
  onOpenQuickExpense?: () => void;
}

export const POSHeader: React.FC<POSHeaderProps> = React.memo(
  ({
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
    onOpenQuickExpense,
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
        if (
          warehouseDropdownRef.current &&
          !warehouseDropdownRef.current.contains(e.target as Node)
        ) {
          setShowWarehouseDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => {
        document.removeEventListener('mousedown', handleClick);
      };
    }, []);

    const actions = (
      <div className="flex gap-1.5">
        <button
          onClick={() => {
            setShowSuspended(!showSuspended);
          }}
          className="relative rounded-xl border border-amber-100 bg-amber-50 p-2 text-amber-600 transition-all hover:bg-amber-100 active:scale-95 dark:border-amber-900/30 dark:bg-amber-900/20"
          title={t('suspended_orders')}
        >
          <PauseCircle size={18} />
          {suspendedOrdersCount > 0 && (
            <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-[10px] font-bold text-white shadow-lg dark:border-slate-900">
              {suspendedOrdersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-slate-600 transition-all hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
          title="الرجوع للرئيسية"
        >
          <Home size={18} />
        </button>
        <button
          onClick={() => {
            setIsQuickMode(!isQuickMode);
          }}
          className={`rounded-xl border p-2 transition-all active:scale-95 ${isQuickMode ? 'border-blue-200 bg-blue-100 text-blue-600 dark:border-blue-800 dark:bg-blue-900/40' : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}
          title="الوضع السريع"
        >
          <Zap size={18} />
        </button>
        {onOpenQuickExpense && (
          <button
            onClick={onOpenQuickExpense}
            className="rounded-xl border border-amber-100 bg-amber-50 p-2 text-amber-600 transition-all hover:bg-amber-100 active:scale-95 dark:border-amber-900/30 dark:bg-amber-900/20"
            title="مصروف درج سريع (نثريات)"
          >
            <Coffee size={18} />
          </button>
        )}
        <button
          onClick={() => navigate(ROUTES.DASHBOARD.DAILY_RECONCILIATION)}
          className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-emerald-600 transition-all hover:bg-emerald-100 active:scale-95 dark:border-emerald-900/30 dark:bg-emerald-900/20"
          title="المطابقة اليومية وإقفال الصندوق"
        >
          <Scale size={18} />
        </button>
        <button
          onClick={onClearCart}
          className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 transition-all hover:bg-rose-100 active:scale-95 dark:border-rose-900/30 dark:bg-rose-900/20"
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
          <div className="flex w-full max-w-[800px] items-center gap-2">
            {/* Warehouse Selector */}
            <div ref={warehouseDropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowWarehouseDropdown(!showWarehouseDropdown);
                }}
                className={`flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 px-2.5 text-[10px] font-black transition-all active:scale-95 md:h-[38px] md:text-xs ${
                  selectedWarehouseId
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                } `}
              >
                <Building2 size={14} />
                <span className="hidden max-w-[100px] truncate sm:inline">
                  {selectedWarehouse ? selectedWarehouse.name_ar : 'الكل'}
                </span>
                <ChevronDown size={12} />
              </button>

              {showWarehouseDropdown && (
                <div className="animate-in fade-in slide-in-from-top-1 absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl duration-150 dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      اختر المستودع
                    </h4>
                  </div>
                  <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700/50">
                    <button
                      type="button"
                      onClick={() => {
                        onWarehouseChange(null);
                        setShowWarehouseDropdown(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-right text-[11px] font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30',
                        !selectedWarehouseId
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'
                          : 'text-slate-600 dark:text-slate-300'
                      )}
                    >
                      <span>جميع المستودعات</span>
                      {!selectedWarehouseId && <Building2 size={14} className="text-indigo-500" />}
                    </button>
                    {warehouses.map(wh => (
                      <button
                        key={wh.id}
                        type="button"
                        onClick={() => {
                          onWarehouseChange(wh.id);
                          setShowWarehouseDropdown(false);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-right text-[11px] font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30',
                          selectedWarehouseId === wh.id
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'
                            : 'text-slate-600 dark:text-slate-300'
                        )}
                      >
                        <div className="flex flex-col">
                          <span>{wh.name_ar}</span>
                          {wh.branches?.name && (
                            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                              {wh.branches.name}
                            </span>
                          )}
                        </div>
                        {selectedWarehouseId === wh.id && (
                          <Building2 size={14} className="text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div ref={searchContainerRef} className="relative w-full min-w-0 flex-1">
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
                triggerRef={searchContainerRef}
                total={search.total}
                searchTimeMs={search.searchTimeMs}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setInStockOnly(!inStockOnly);
              }}
              className={`flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-[10px] font-black transition-all active:scale-95 md:h-[38px] md:text-xs ${
                inStockOnly
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              } `}
            >
              <Layers size={14} className={inStockOnly ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">متوفر فقط</span>
            </button>

            {!isQuickMode && (
              <button
                type="button"
                onClick={onLaunchScanner}
                className="flex h-[34px] shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-xl shadow-blue-500/10 transition-all hover:bg-blue-700 active:scale-[0.98] md:h-[38px] md:text-xs"
              >
                <ScanBarcode size={14} />
                <span className="hidden sm:inline">{t('launch_scanner')}</span>
              </button>
            )}
          </div>
        }
      />
    );
  }
);

POSHeader.displayName = 'POSHeader';
