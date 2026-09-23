/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-type-conversion, @typescript-eslint/explicit-function-return-type */
import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Send,
  SendHorizontal,
  Clipboard,
  History,
  RotateCcw,
  Save,
  User,
  Search,
  CheckCircle,
  AlertCircle,
  Package,
  Layers,
  Phone,
} from 'lucide-react';
import { useRequisitionsStore } from '../../store/requisitionsStore';
import { RequisitionsExcelGrid } from './RequisitionsExcelGrid';
import { RequisitionsPrintSheet } from './RequisitionsPrintSheet';
import { RequisitionsPasteModal } from './RequisitionsPasteModal';
import { RequisitionsHistoryModal } from './RequisitionsHistoryModal';
import { exportRequisitionsToExcel } from '../../utils/requisitionsExcelExporter';
import {
  openRequisitionsWhatsApp,
  openRequisitionsTelegram,
} from '../../utils/requisitionsShareHelper';
import { useSuppliers } from '@/features/parties/hooks';
import { useCompany } from '@/features/settings/hooks';
import { exportToPDF } from '@/core/utils/pdfExporter';
import { formatLocalDate } from '@/core/utils/dateUtils';
import { logger } from '@/core/utils/logger';

export const SalesRequisitionsView: React.FC = () => {
  const { data: company } = useCompany();
  const { data: suppliers } = useSuppliers('');

  const {
    items,
    supplier,
    notes,
    batchTitle,
    setSupplier,
    setNotes,
    setBatchTitle,
    saveCurrentBatch,
    clearItems,
  } = useRequisitionsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const validItems = items.filter(item => item.name.trim() !== '' || item.partNumber.trim() !== '');
  const totalItemsCount = validItems.length;
  const totalQuantity = validItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

  // Handle Export to Excel
  const handleExportExcel = async () => {
    if (validItems.length === 0) {
      showNotification('error', 'يرجى تسجيل صنف واحد على الأقل قبل التصدير');
      return;
    }
    setIsExportingExcel(true);
    try {
      await exportRequisitionsToExcel({
        companyName: company?.name_ar || company?.name_en || 'مؤسسة الزهراء لقطع الغيار',
        companyAddress: company?.address || '',
        taxNumber: company?.tax_number || '',
        supplier,
        items: validItems,
        title: batchTitle,
        notes,
      });
      showNotification('success', 'تم تصدير ملف الإكسل الملون بنجاح');
    } catch (err) {
      logger.error('SalesRequisitionsView', 'Excel export failed', err);
      showNotification('error', 'حدث خطأ أثناء تصدير ملف Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle Export to PDF
  const handleExportPdf = async () => {
    if (validItems.length === 0) {
      showNotification('error', 'يرجى تسجيل صنف واحد على الأقل قبل تصدير PDF');
      return;
    }
    if (!printRef.current) {
      showNotification('error', 'تعذر العثور على ورقة الطباعة');
      return;
    }

    setIsExportingPdf(true);
    try {
      const fileName = `مطلوبات_${supplier?.name ? supplier.name.replace(/\s+/g, '_') : 'طلب'}_${formatLocalDate()}`;
      await exportToPDF(printRef.current, fileName, {
        pageSize: 'a4',
        orientation: 'p',
        marginMm: 8,
      });
      showNotification('success', 'تم تصدير ملف PDF بالهيدر الاحترافي بنجاح');
    } catch (err) {
      logger.error('SalesRequisitionsView', 'PDF export failed', err);
      showNotification('error', 'فشل في تصدير ملف PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle WhatsApp Share
  const handleShareWhatsApp = () => {
    if (validItems.length === 0) {
      showNotification('error', 'يرجى كتابة صنف واحد على الأقل للمشاركة عبر واتساب');
      return;
    }
    openRequisitionsWhatsApp({
      companyName: company?.name_ar || company?.name_en || '',
      supplier,
      items: validItems,
      notes,
    });
    showNotification('success', 'تم فتح واتساب مع الرسالة المنسقة');
  };

  // Handle Telegram Share
  const handleShareTelegram = () => {
    if (validItems.length === 0) {
      showNotification('error', 'يرجى كتابة صنف واحد على الأقل للمشاركة عبر تليجرام');
      return;
    }
    openRequisitionsTelegram({
      companyName: company?.name_ar || company?.name_en || '',
      supplier,
      items: validItems,
      notes,
    });
    showNotification('success', 'تم فتح تليجرام مع الرسالة المنسقة');
  };

  // Handle Save Current Batch
  const handleSaveBatch = () => {
    if (validItems.length === 0) {
      showNotification('error', 'الجدول فارغ، لا يوجد ما يمكن حفظه');
      return;
    }
    saveCurrentBatch();
    showNotification('success', 'تم حفظ الطلب في سجل المطلوبات بنجاح');
  };

  // Handle Clear Table
  const handleClear = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع بنود الجدول الحالية؟')) {
      clearItems();
      showNotification('info', 'تم مسح الجدول');
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-8" dir="rtl">
      {/* Top Banner Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-bold transition-all ${
            notification.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
              : notification.type === 'error'
                ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                : 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Control & Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Left: Supplier Selector & Title */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Batch Title Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">عنوان الطلب:</span>
            <input
              type="text"
              value={batchTitle}
              onChange={e => {
                setBatchTitle(e.target.value);
              }}
              placeholder="مثال: طلبية قطع أسبوعية..."
              className="h-8 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Supplier Picker */}
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-500">المورد:</span>
            <select
              value={supplier?.id || ''}
              onChange={e => {
                const sId = e.target.value;
                if (!sId) {
                  setSupplier(null);
                } else {
                  const found = suppliers.find(s => s.id === sId);
                  if (found) {
                    setSupplier({
                      id: found.id,
                      name: found.name,
                      phone: found.phone || '',
                    });
                  }
                }
              }}
              className="h-8 max-w-[180px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">-- اختر مورد (اختياري) --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>

            {/* Custom Supplier Phone if not in list */}
            <div className="flex items-center gap-1">
              <Phone size={13} className="text-slate-400" />
              <input
                type="text"
                dir="ltr"
                value={supplier?.phone || ''}
                onChange={e => {
                  setSupplier({
                    id: supplier?.id ?? undefined,
                    name: supplier?.name || 'مورد عام',
                    phone: e.target.value || undefined,
                  });
                }}
                placeholder="رقم الهاتف للواتساب"
                className="h-8 w-32 rounded-lg border border-slate-300 bg-slate-50 px-2 text-left font-mono text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Paste from Excel */}
          <button
            type="button"
            onClick={() => {
              setIsPasteModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="لصق أعمدة وصفوف من ملف إكسل خارجي"
          >
            <Clipboard size={14} className="text-blue-600" />
            <span className="hidden sm:inline">لصق من إكسل</span>
          </button>

          {/* History */}
          <button
            type="button"
            onClick={() => {
              setIsHistoryModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="عرض الطلبات والمسودات المحفوظة"
          >
            <History size={14} className="text-amber-600" />
            <span className="hidden sm:inline">السجل</span>
          </button>

          {/* Save Batch */}
          <button
            type="button"
            onClick={handleSaveBatch}
            className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800 transition-colors hover:bg-blue-100 active:scale-95 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
            title="حفظ القائمة الحالية كمسودة"
          >
            <Save size={14} />
            <span>حفظ</span>
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            onClick={() => {
              void handleExportExcel();
            }}
            disabled={isExportingExcel}
            className="shadow-2xs flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-800 active:scale-95 disabled:opacity-50"
            title="تصدير جدول إكسل ملون احترافي"
          >
            <FileSpreadsheet size={14} />
            <span>{isExportingExcel ? 'جاري التصدير...' : 'تصدير Excel'}</span>
          </button>

          {/* Export to PDF */}
          <button
            type="button"
            onClick={() => {
              void handleExportPdf();
            }}
            disabled={isExportingPdf}
            className="shadow-2xs flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-rose-800 active:scale-95 disabled:opacity-50"
            title="تصدير ملف PDF بهيدر المنشأة الرسمي"
          >
            <FileText size={14} />
            <span>{isExportingPdf ? 'جاري التحويل...' : 'تصدير PDF'}</span>
          </button>

          {/* Send via WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="shadow-2xs flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95"
            title="إرسال قائمة المطلوب عبر واتساب للمورد"
          >
            <Send size={13} />
            <span>واتساب</span>
          </button>

          {/* Send via Telegram */}
          <button
            type="button"
            onClick={handleShareTelegram}
            className="shadow-2xs flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-sky-700 active:scale-95"
            title="مشاركة عبر تليجرام"
          >
            <SendHorizontal size={13} />
            <span>تليجرام</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
            title="مسح الجدول"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges & Quick Search */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="shadow-2xs flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <Package size={13} className="text-blue-500" />
            <span>عدد الأصناف المسجلة:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {totalItemsCount}
            </span>
          </div>

          <div className="shadow-2xs flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <Layers size={13} className="text-emerald-500" />
            <span>إجمالي الكمية المطلوبة:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {totalQuantity}
            </span>
          </div>

          {supplier?.name && (
            <div className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              <User size={13} />
              <span>المورد:</span>
              <span className="font-bold">{supplier.name}</span>
            </div>
          )}
        </div>

        {/* Quick Filter Box */}
        <div className="relative w-64 max-w-full">
          <Search
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
            }}
            placeholder="بحث سريع في عناصر الجدول..."
            className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {/* The Excel Grid Component */}
      <RequisitionsExcelGrid searchTerm={searchTerm} />

      {/* General Notes for the Order */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <label
          htmlFor="requisitions-general-notes"
          className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          ملاحظات عامة على الطلب (تظهر في التصدير ورسائل الواتساب والتليجرام):
        </label>
        <textarea
          id="requisitions-general-notes"
          rows={2}
          value={notes}
          onChange={e => {
            setNotes(e.target.value);
          }}
          placeholder="مثال: يرجى إرسال الأسعار قبل الشحن، الشحن عبر مكتب التوصيل الفلاني..."
          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        />
      </div>

      {/* Hidden PDF/Print Template (Target for exportToPDF) */}
      <div className="fixed -left-[9999px] top-0 w-[820px] bg-white text-black" aria-hidden="true">
        <div ref={printRef}>
          <RequisitionsPrintSheet
            company={{
              name: company?.name_ar || company?.name_en || 'مؤسسة الزهراء',
              phone: company?.phone ?? undefined,
              address: company?.address ?? undefined,
              tax_number: company?.tax_number ?? undefined,
              logo_url: company?.logo_url ?? undefined,
            }}
            supplier={supplier}
            items={validItems}
            notes={notes}
            batchTitle={batchTitle}
          />
        </div>
      </div>

      {/* Modals */}
      <RequisitionsPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => {
          setIsPasteModalOpen(false);
        }}
      />
      <RequisitionsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
        }}
      />
    </div>
  );
};
