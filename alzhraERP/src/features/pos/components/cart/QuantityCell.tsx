import React, { useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, CornerDownLeft } from 'lucide-react';

export interface QuantityCellProps {
  quantity: number;
  productId: string;
  isEditing: boolean;
  qtyInputValue: string;
  onQtyInputChange: (val: string) => void;
  onCommitQty: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveClick: (productId: string) => void;
}

const QuantityEditInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onCommit: () => void;
}> = ({ value, onChange, onCommit }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-0.5">
      <input
        ref={inputRef}
        type="number"
        step="any"
        min="0"
        value={value}
        onChange={e => {
          onChange(e.target.value);
        }}
        onBlur={onCommit}
        className="w-full rounded border border-blue-500 bg-white py-0.5 text-center font-mono text-xs font-black text-blue-600 shadow-xs outline-none dark:bg-slate-950 dark:text-blue-400"
      />
      <button type="button" onClick={onCommit} className="text-emerald-600 hover:text-emerald-700">
        <CornerDownLeft size={10} />
      </button>
    </div>
  );
};

const QuantityControls: React.FC<{
  quantity: number;
  productId: string;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveClick: (productId: string) => void;
}> = ({ quantity, productId, onUpdateQuantity, onRemoveClick }) => (
  <div className="flex items-center justify-between gap-0.5">
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        if (quantity > 1) {
          onUpdateQuantity(productId, quantity - 1);
        } else {
          onRemoveClick(productId);
        }
      }}
      className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
      title={quantity === 1 ? 'حذف' : 'تقليل'}
    >
      {quantity === 1 ? <Trash2 size={10} /> : <Minus size={10} />}
    </button>
    <span className="min-w-[18px] font-mono text-xs font-black text-slate-800 dark:text-slate-100">
      {quantity}
    </span>
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onUpdateQuantity(productId, quantity + 1);
      }}
      className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
      title="زيادة"
    >
      <Plus size={10} />
    </button>
  </div>
);

export const QuantityCell: React.FC<QuantityCellProps> = React.memo(
  ({
    quantity,
    productId,
    isEditing,
    qtyInputValue,
    onQtyInputChange,
    onCommitQty,
    onUpdateQuantity,
    onRemoveClick,
  }) => {
    if (isEditing) {
      return (
        <QuantityEditInput
          value={qtyInputValue}
          onChange={onQtyInputChange}
          onCommit={onCommitQty}
        />
      );
    }
    return (
      <QuantityControls
        quantity={quantity}
        productId={productId}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveClick={onRemoveClick}
      />
    );
  }
);

QuantityCell.displayName = 'QuantityCell';
