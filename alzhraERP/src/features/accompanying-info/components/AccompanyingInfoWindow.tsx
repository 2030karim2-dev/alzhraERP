import React, { useEffect, useState, useCallback } from 'react';
import {
  Pin,
  PinOff,
  Minimize2,
  Maximize2,
  X,
  Search,
  Users,
  FileText,
  Package,
  Loader2,
  Info,
  GripHorizontal,
} from 'lucide-react';
import { motion, useDragControls } from 'framer-motion';
import { useAccompanyingInfoStore } from '../store/accompanyingInfoStore';
import { accompanyingInfoService } from '../services/accompanyingInfoService';
import { useAuthStore } from '../../auth/store';
import { PartyCurrencyGrid } from './PartyCurrencyGrid';
import { InvoiceSummaryGrid } from './InvoiceSummaryGrid';
import { ProductStockGrid } from './ProductStockGrid';

export const AccompanyingInfoWindow: React.FC = () => {
  const {
    enabled,
    isOpen,
    isPinned,
    isMinimized,
    target,
    partyData,
    invoiceData,
    productData,
    isLoading,
    togglePinned,
    toggleMinimized,
    setOpen,
    setPartyData,
    setInvoiceData,
    setProductData,
    setLoading,
    setTarget,
  } = useAccompanyingInfoStore();

  const user = useAuthStore(s => s.user);
  const companyId = user?.company_id || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      type: 'customer' | 'supplier' | 'product' | 'invoice';
      id: string;
      label: string;
      sub?: string | undefined;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // للتحكم بالسحب (Drag)
  const dragControls = useDragControls();

  // تحميل بيانات الكيان المستهدف فور تغييره
  const loadTargetData = useCallback(
    async (entityTarget: typeof target) => {
      if (!entityTarget || !companyId) return;

      setLoading(true);
      try {
        if (entityTarget.type === 'customer' || entityTarget.type === 'supplier') {
          const res = await accompanyingInfoService.fetchPartyInfo(entityTarget.id, companyId);
          setPartyData(res);
        } else if (entityTarget.type === 'invoice') {
          const res = await accompanyingInfoService.fetchInvoiceInfo(entityTarget.id, companyId);
          setInvoiceData(res);
        } else if (entityTarget.type === 'product') {
          const res = await accompanyingInfoService.fetchProductInfo(entityTarget.id, companyId);
          setProductData(res);
        }
      } catch (err) {
        console.error('Error loading accompanying info:', err);
      } finally {
        setLoading(false);
      }
    },
    [companyId, setLoading, setPartyData, setInvoiceData, setProductData]
  );

  useEffect(() => {
    if (isOpen && target) {
      loadTargetData(target);
    }
  }, [isOpen, target, loadTargetData]);

  // البحث السريع داخل النافذة
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    const q = val.trim();
    if (!q || !companyId) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const list = await accompanyingInfoService.searchEntities(q, companyId);
      setSearchResults(list);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // مستمع للأحداث للنقر على أي عنصر يحمل data-inspect-type و data-inspect-id
  // لا يفتح النافذة قسراً، بل يحدّث الكيان المستهدف فقط إذا كانت الميزة مفعلة والنافذة مفتوحة
  useEffect(() => {
    if (!enabled || !isOpen) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const targetEl = (e.target as HTMLElement).closest(
        '[data-inspect-type]'
      ) as HTMLElement | null;
      if (targetEl) {
        const type = targetEl.getAttribute('data-inspect-type') as
          'customer' | 'supplier' | 'invoice' | 'product';
        const id = targetEl.getAttribute('data-inspect-id');
        const title = targetEl.getAttribute('data-inspect-title') || undefined;

        if (type && id) {
          setTarget({ type, id, ...(title ? { title } : {}) });
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [enabled, isOpen, setTarget]);

  if (!enabled || !isOpen) return null;

  return (
    <motion.div
      drag={!isMinimized}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      className={`fixed z-40 select-text ${
        isMinimized
          ? 'bottom-4 start-4 h-12 w-80 shadow-lg'
          : 'start-4 top-14 h-[500px] max-h-[calc(100vh-4.5rem)] w-96 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-slate-900/10 dark:ring-white/10'
      } flex flex-col rounded-xl border-2 border-blue-200 bg-white font-sans dark:border-blue-800 dark:bg-slate-950`}
      style={{
        direction: 'rtl',
        resize: !isMinimized ? 'both' : 'none',
        overflow: 'hidden',
        minWidth: isMinimized ? '320px' : '360px',
        minHeight: isMinimized ? '48px' : '400px',
      }}
    >
      {/* شريط عنوان النافذة المرافقة (مصمت واحترافي بلون أزرق لتمييزه) */}
      <div
        className={`flex flex-shrink-0 items-center justify-between border-b border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-slate-900 ${
          !isMinimized ? 'cursor-move touch-none' : 'cursor-default'
        }`}
        onPointerDown={e => {
          if (!isMinimized) dragControls.start(e);
        }}
      >
        <div className="flex items-center gap-1.5">
          {!isMinimized && (
            <GripHorizontal
              size={14}
              className="hidden text-slate-400 dark:text-slate-500 md:block"
            />
          )}
          <Info size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            المعلومات المرافقة
          </span>
          {isLoading && <Loader2 size={12} className="ms-1 animate-spin text-blue-500" />}
        </div>

        {/* أزرار التحكم: تثبيت، تصغير، إغلاق */}
        <div className="flex items-center gap-1">
          <button
            onClick={togglePinned}
            title={isPinned ? 'إلغاء التثبيت' : 'تثبيت النافذة'}
            className={`rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 ${
              isPinned ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : ''
            }`}
          >
            {isPinned ? <Pin size={15} className="fill-current" /> : <PinOff size={15} />}
          </button>

          <button
            onClick={toggleMinimized}
            title={isMinimized ? 'استعادة' : 'تصغير'}
            className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          </button>

          <button
            onClick={() => setOpen(false)}
            title="إغلاق"
            className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-rose-500 hover:text-white dark:text-slate-300"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* محتوى النافذة (عند عدم التصغير) */}
      {!isMinimized && (
        <div className="flex flex-1 flex-col space-y-2.5 overflow-y-auto p-2.5">
          {/* شريط البحث المباشر في النافذة */}
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن عميل أو صنف أو فاتورة..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pe-3 ps-9 text-xs text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {isSearching ? (
              <Loader2
                size={14}
                className="pointer-events-none absolute start-3 top-2.5 animate-spin text-blue-500"
              />
            ) : (
              <Search
                size={14}
                className="pointer-events-none absolute start-3 top-2.5 text-slate-400"
              />
            )}

            {/* قائمة نتائج البحث السريع */}
            {searchResults.length > 0 && (
              <div className="absolute end-0 start-0 top-full z-50 mt-1 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-300 bg-white text-xs shadow-xl dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTarget({ type: res.type, id: res.id, title: res.label });
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    className="flex w-full items-center justify-between p-2 text-start hover:bg-blue-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="flex items-center gap-2">
                      {res.type === 'product' ? (
                        <Package size={14} className="text-emerald-500" />
                      ) : res.type === 'invoice' ? (
                        <FileText size={14} className="text-amber-500" />
                      ) : (
                        <Users size={14} className="text-blue-500" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {res.label}
                      </span>
                    </div>
                    {res.sub && <span className="text-[11px] text-slate-400">{res.sub}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* حالة التحميل */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span className="text-xs">جاري تحميل المعلومات المرافقة...</span>
            </div>
          ) : target?.type === 'customer' || target?.type === 'supplier' ? (
            partyData ? (
              <PartyCurrencyGrid data={partyData} />
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                لم يتم العثور على بيانات الطرف المحدد
              </div>
            )
          ) : target?.type === 'invoice' ? (
            invoiceData ? (
              <InvoiceSummaryGrid data={invoiceData} />
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                لم يتم العثور على بيانات الفاتورة المحددة
              </div>
            )
          ) : target?.type === 'product' ? (
            productData ? (
              <ProductStockGrid data={productData} />
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                لم يتم العثور على بيانات الصنف المحدد
              </div>
            )
          ) : (
            /* الحالة الافتراضية عندما تفتح النافذة ولم يتم النقر على شيء بعد */
            <div className="mt-4 flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
              <div className="rounded-full bg-blue-50 p-3 dark:bg-blue-900/20">
                <Info size={32} className="text-blue-500" />
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                وضع المعلومات المرافقة نشط ⚡
              </div>
              <p className="max-w-[250px] text-xs leading-relaxed">
                انقر على أي <strong className="text-blue-600">عميل</strong>، أو{' '}
                <strong className="text-emerald-600">صنف</strong>، أو{' '}
                <strong className="text-amber-600">فاتورة</strong> في النظام لعرض كافة معلوماته
                التفصيلية فوراً.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
