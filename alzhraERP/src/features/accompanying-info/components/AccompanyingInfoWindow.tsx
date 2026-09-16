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
} from 'lucide-react';
import { useAccompanyingInfoStore } from '../store/accompanyingInfoStore';
import { accompanyingInfoService } from '../services/accompanyingInfoService';
import { useAuthStore } from '../../auth/store';
import { PartyCurrencyGrid } from './PartyCurrencyGrid';
import { InvoiceSummaryGrid } from './InvoiceSummaryGrid';
import { ProductStockGrid } from './ProductStockGrid';

export const AccompanyingInfoWindow: React.FC = () => {
  const {
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

  // مستمع عام للأحداث للنقر على أي عنصر يحمل data-inspect-type و data-inspect-id
  useEffect(() => {
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
          setOpen(true);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [setTarget, setOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-40 select-text transition-all duration-200 ${
        isMinimized
          ? 'bottom-4 start-4 h-10 w-72 shadow-lg'
          : 'start-4 top-14 max-h-[calc(100vh-4.5rem)] w-80 shadow-2xl md:w-96'
      } flex flex-col overflow-hidden rounded-md border-2 border-slate-400 bg-[#f5f6f8] font-sans dark:border-slate-700 dark:bg-slate-900`}
      style={{ direction: 'rtl' }}
    >
      {/* شريط عنوان النافذة (مطابق لترويسة "المعلومات المرافقة" في الصور) */}
      <div className="flex flex-shrink-0 cursor-default items-center justify-between border-b border-slate-300 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 px-2.5 py-1.5 dark:border-slate-700 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800">
        <div className="flex items-center gap-1.5">
          <Info size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            المعلومات المرافقة
          </span>
          {isLoading && <Loader2 size={12} className="ms-1 animate-spin text-blue-500" />}
        </div>

        {/* أزرار التحكم: تثبيت، تصغير، إغلاق */}
        <div className="flex items-center gap-1">
          <button
            onClick={togglePinned}
            title={isPinned ? 'إلغاء التثبيت' : 'تثبيت النافذة'}
            className={`rounded p-1 text-slate-600 transition-colors hover:bg-slate-300/60 dark:text-slate-300 dark:hover:bg-slate-700 ${
              isPinned ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : ''
            }`}
          >
            {isPinned ? <Pin size={13} className="fill-current" /> : <PinOff size={13} />}
          </button>

          <button
            onClick={toggleMinimized}
            title={isMinimized ? 'استعادة' : 'تصغير'}
            className="rounded p-1 text-slate-600 transition-colors hover:bg-slate-300/60 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>

          <button
            onClick={() => setOpen(false)}
            title="إغلاق"
            className="rounded p-1 text-slate-600 transition-colors hover:bg-rose-500 hover:text-white dark:text-slate-300"
          >
            <X size={13} />
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
              className="w-full rounded border border-slate-300 bg-white py-1 pe-2 ps-7 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {isSearching ? (
              <Loader2
                size={12}
                className="pointer-events-none absolute start-2 top-2 animate-spin text-blue-500"
              />
            ) : (
              <Search
                size={12}
                className="pointer-events-none absolute start-2 top-2 text-slate-400"
              />
            )}

            {/* قائمة نتائج البحث السريع */}
            {searchResults.length > 0 && (
              <div className="absolute end-0 start-0 top-full z-50 mt-1 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded border border-slate-300 bg-white text-[11px] shadow-xl dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
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
                    <div className="flex items-center gap-1.5">
                      {res.type === 'product' ? (
                        <Package size={12} className="text-emerald-500" />
                      ) : res.type === 'invoice' ? (
                        <FileText size={12} className="text-amber-500" />
                      ) : (
                        <Users size={12} className="text-blue-500" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {res.label}
                      </span>
                    </div>
                    {res.sub && <span className="text-[10px] text-slate-400">{res.sub}</span>}
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
            <div className="flex flex-col items-center justify-center space-y-2 rounded border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <Info size={28} className="text-blue-500/70" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                وضع المعلومات المرافقة نشط ⚡
              </div>
              <p className="text-[11px] leading-relaxed">
                انقر على أي <strong className="text-blue-600">عميل</strong>، أو{' '}
                <strong className="text-emerald-600">صنف</strong>، أو{' '}
                <strong className="text-amber-600">فاتورة</strong> في أي شاشة لعرض كافة معلوماته
                المرافقة فوراً.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
