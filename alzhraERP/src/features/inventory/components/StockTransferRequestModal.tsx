import React, { useState, useMemo } from 'react';
import { X, ArrowRightLeft, Package, Loader2 } from 'lucide-react';
import {
  useCreateStockTransferRequest,
  type CreateTransferRequestDTO,
} from '../../inventory/hooks/useStockTransferRequests';
import { formatNumberDisplay } from '../../../core/utils';
import type { Product } from '../../inventory/types';

interface Props {
  product: Product;
  sourceBranchId: string;
  sourceBranchName: string;
  requesterBranchId: string;
  availableQty: number;
  onClose: () => void;
}

const PRESET_QUANTITIES = [1, 2, 5, 10];

/**
 * StockTransferRequestModal
 * يظهر عندما يحاول موظف فرع "محمد" أو أي فرع بوضع inventory_only
 * سحب منتج من مستودع فرع آخر — يسمح له بإرسال طلب نقل رسمي.
 */
const StockTransferRequestModal: React.FC<Props> = ({
  product,
  sourceBranchId,
  sourceBranchName,
  requesterBranchId,
  availableQty,
  onClose,
}) => {
  const availableSources = useMemo(() => {
    const dist = product.warehouse_distribution || [];
    const external = dist.filter(
      w => w.quantity > 0 && (w.branch_id ? w.branch_id !== requesterBranchId : true)
    );
    if (external.length === 0) {
      return [{ branchId: sourceBranchId, branchName: sourceBranchName, qty: availableQty }];
    }
    return external.map(w => ({
      branchId: w.branch_id || w.warehouse_id,
      branchName: w.branch_name || w.warehouse_name,
      qty: w.quantity,
    }));
  }, [
    product.warehouse_distribution,
    sourceBranchId,
    sourceBranchName,
    availableQty,
    requesterBranchId,
  ]);

  const [activeBranchId, setActiveBranchId] = useState(sourceBranchId);
  const currentSource =
    availableSources.find(s => s.branchId === activeBranchId) || availableSources[0];
  const maxAvailable = currentSource?.qty ?? availableQty;
  const targetBranchId = currentSource?.branchId ?? sourceBranchId;
  const targetBranchName = currentSource?.branchName ?? sourceBranchName;

  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState('');
  const { mutate: createRequest, isPending } = useCreateStockTransferRequest();

  const parsedQty = Number(quantity);
  const isValidQty = !isNaN(parsedQty) && parsedQty > 0 && parsedQty <= maxAvailable;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidQty) return;

    const dto: CreateTransferRequestDTO = {
      productId: product.id,
      sourceBranchId: targetBranchId,
      quantity: parsedQty,
    };
    const trimmedNotes = notes.trim();
    if (trimmedNotes) dto.notes = trimmedNotes;

    createRequest({ requesterBranchId, dto }, { onSuccess: onClose });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="طلب نقل مخزون"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
              <ArrowRightLeft size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-amber-900 dark:text-amber-200">
                طلب نقل مخزون
              </h2>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                من {targetBranchName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Product Info */}
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <Package size={20} className="text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {product.name}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              {product.part_number && product.part_number !== '---' && (
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {product.part_number}
                </span>
              )}
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                متوفر: {formatNumberDisplay(maxAvailable)} {product.unit || 'وحدة'}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5 pt-4">
          {/* الفرع المصدر إذا كان هناك أكثر من فرع */}
          {availableSources.length > 1 && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                الفرع المصدر <span className="text-rose-500">*</span>
              </label>
              <select
                value={activeBranchId}
                onChange={e => {
                  setActiveBranchId(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {availableSources.map(s => (
                  <option key={s.branchId} value={s.branchId}>
                    {s.branchName} (متوفر: {formatNumberDisplay(s.qty)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* الكمية */}
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
              الكمية المطلوبة <span className="text-rose-500">*</span>
            </label>
            {/* أزرار الكميات السريعة */}
            <div className="mb-2 flex gap-2">
              {PRESET_QUANTITIES.filter(q => q <= maxAvailable).map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuantity(String(q));
                  }}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                    quantity === String(q)
                      ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-amber-400 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-600'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={availableQty}
              step="0.5"
              value={quantity}
              onChange={e => {
                setQuantity(e.target.value);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-bold text-slate-800 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="0"
              required
              dir="ltr"
            />
            {!isValidQty && quantity && parsedQty > availableQty && (
              <p className="mt-1.5 text-[11px] text-rose-500">
                ⚠ الكمية تتجاوز المتوفر ({formatNumberDisplay(availableQty)})
              </p>
            )}
          </div>

          {/* ملاحظات */}
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
              }}
              rows={2}
              maxLength={300}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              placeholder="سبب الطلب أو توجيهات إضافية..."
            />
          </div>

          {/* تنبيه */}
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            <span className="mt-0.5 text-base leading-none">ℹ</span>
            <p>سيتم إشعار مسؤول الفرع المصدّر بطلبك. عند الموافقة، يُحوَّل المخزون رسمياً.</p>
          </div>

          {/* أزرار الإجراء */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isValidQty || isPending}
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> جاري الإرسال...
                </>
              ) : (
                <>
                  <ArrowRightLeft size={16} /> إرسال طلب النقل
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransferRequestModal;
