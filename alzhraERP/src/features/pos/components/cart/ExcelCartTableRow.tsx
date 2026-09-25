import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency } from '../../../../core/utils';
import type { SalesCartItem } from '../../../sales/store';
import { PriceCellInput } from './PriceCellInput';
import { QuantityCell } from './QuantityCell';

export interface ExcelCartRowHandlers {
  onCellClick: (colIdx: number) => void;
  onCellDoubleClick: (colIdx: number) => void;
  onQtyInputChange: (val: string) => void;
  onCommitQty: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveClick: (productId: string) => void;
  onPriceFocus: () => void;
  onPriceKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface ExcelCartTableRowProps {
  item: SalesCartItem;
  rowIdx: number;
  isRowActive: boolean;
  isCellActive: (colIdx: number) => boolean;
  activeCellRef: React.RefObject<HTMLTableCellElement | null>;
  isCrossBranch?: boolean | undefined;
  isEditingQty: boolean;
  qtyInputValue: string;
  handlers: ExcelCartRowHandlers;
}

function getStockStatus(item: SalesCartItem): {
  totalAvailable: number;
  isOverStock: boolean;
  isLowStock: boolean;
} {
  const totalAvailable = (item.warehouse_distribution ?? []).reduce(
    (sum, wd) => sum + wd.quantity,
    0
  );
  return {
    totalAvailable,
    isOverStock: item.quantity > totalAvailable,
    isLowStock: totalAvailable > 0 && item.quantity >= totalAvailable,
  };
}

function getRowClassName(
  isRowActive: boolean,
  isOverStock: boolean,
  isCrossBranch: boolean | undefined
): string {
  return cn(
    'h-7 transition-colors',
    isRowActive
      ? 'bg-blue-50/30 dark:bg-blue-950/20'
      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30',
    isOverStock && 'bg-rose-50/50 dark:bg-rose-900/15',
    isCrossBranch === true &&
      !isOverStock &&
      'bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20'
  );
}

const CartProductNameCell: React.FC<{
  name: string;
  isOverStock: boolean;
  isLowStock: boolean;
  totalAvailable: number;
  isActive: boolean;
  activeCellRef: React.RefObject<HTMLTableCellElement | null>;
  onClick: () => void;
}> = ({ name, isOverStock, isLowStock, totalAvailable, isActive, activeCellRef, onClick }) => (
  <td
    ref={isActive ? activeCellRef : undefined}
    onClick={onClick}
    className={cn(
      'relative cursor-pointer border-b border-l border-slate-200 px-1.5 py-1 align-middle dark:border-slate-700/80',
      isActive &&
        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
    )}
  >
    <div className="flex items-center gap-1 overflow-hidden">
      {isOverStock && (
        <span
          title={`الكمية تتجاوز المتاح (${String(totalAvailable)})`}
          className="flex shrink-0 items-center"
        >
          <AlertTriangle size={11} className="text-rose-500" />
        </span>
      )}
      {isLowStock && !isOverStock && (
        <span title={`المتبقي: ${String(totalAvailable)}`} className="flex shrink-0 items-center">
          <AlertTriangle size={11} className="text-amber-500" />
        </span>
      )}
      <span
        className="truncate text-[11px] font-bold leading-tight text-slate-800 dark:text-slate-100"
        title={name}
      >
        {name}
      </span>
    </div>
    {isActive && (
      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
    )}
  </td>
);

const CartPartNumberCell: React.FC<{
  partNumber: string | undefined;
  sku: string | undefined;
  isActive: boolean;
  activeCellRef: React.RefObject<HTMLTableCellElement | null>;
  onClick: () => void;
}> = ({ partNumber, sku, isActive, activeCellRef, onClick }) => (
  <td
    ref={isActive ? activeCellRef : undefined}
    onClick={onClick}
    className={cn(
      'relative cursor-pointer border-b border-l border-slate-200 px-1 py-1 align-middle font-mono text-[10px] text-slate-500 dark:border-slate-700/80 dark:text-slate-400',
      isActive &&
        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
    )}
  >
    <span className="block truncate">
      {partNumber !== undefined && partNumber !== ''
        ? partNumber
        : sku !== undefined && sku !== ''
          ? sku
          : '-'}
    </span>
    {isActive && (
      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
    )}
  </td>
);

const CartQuantityCell: React.FC<{
  item: SalesCartItem;
  isActive: boolean;
  activeCellRef: React.RefObject<HTMLTableCellElement | null>;
  isEditingQty: boolean;
  qtyInputValue: string;
  handlers: ExcelCartRowHandlers;
}> = ({ item, isActive, activeCellRef, isEditingQty, qtyInputValue, handlers }) => (
  <td
    ref={isActive ? activeCellRef : undefined}
    onClick={() => {
      handlers.onCellClick(3);
    }}
    onDoubleClick={() => {
      handlers.onCellDoubleClick(3);
    }}
    className={cn(
      'relative cursor-pointer border-b border-l border-slate-200 px-0.5 py-0.5 text-center align-middle dark:border-slate-700/80',
      isActive &&
        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
    )}
  >
    <QuantityCell
      quantity={item.quantity}
      productId={item.productId}
      isEditing={isEditingQty}
      qtyInputValue={qtyInputValue}
      onQtyInputChange={handlers.onQtyInputChange}
      onCommitQty={handlers.onCommitQty}
      onUpdateQuantity={handlers.onUpdateQuantity}
      onRemoveClick={handlers.onRemoveClick}
    />
    {isActive && (
      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
    )}
  </td>
);

const CartPriceCell: React.FC<{
  item: SalesCartItem;
  rowIdx: number;
  isActive: boolean;
  activeCellRef: React.RefObject<HTMLTableCellElement | null>;
  handlers: ExcelCartRowHandlers;
}> = ({ item, rowIdx, isActive, activeCellRef, handlers }) => (
  <td
    ref={isActive ? activeCellRef : undefined}
    onClick={() => {
      handlers.onCellClick(4);
    }}
    className={cn(
      'relative border-b border-l border-slate-200 p-0 text-left align-middle dark:border-slate-700/80',
      isActive &&
        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
    )}
  >
    <PriceCellInput
      productId={item.productId}
      price={item.price}
      rowIndex={rowIdx}
      onFocus={handlers.onPriceFocus}
      onKeyDown={handlers.onPriceKeyDown}
    />
    {isActive && (
      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
    )}
  </td>
);

const CartTotalCell: React.FC<{
  total: number;
  isActive: boolean;
  activeCellRef: React.RefObject<HTMLTableCellElement | null>;
  onClick: () => void;
}> = ({ total, isActive, activeCellRef, onClick }) => (
  <td
    ref={isActive ? activeCellRef : undefined}
    onClick={onClick}
    className={cn(
      'relative cursor-pointer border-b border-l border-slate-200 px-1 py-0.5 text-left align-middle dark:border-slate-700/80',
      isActive &&
        'z-10 bg-blue-50/50 ring-2 ring-inset ring-blue-600 dark:bg-blue-900/20 dark:ring-blue-500'
    )}
  >
    <span
      dir="ltr"
      className="block truncate font-mono text-[10px] font-black text-slate-900 dark:text-slate-100"
    >
      {formatCurrency(total)}
    </span>
    {isActive && (
      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-blue-600 dark:bg-blue-500" />
    )}
  </td>
);

const CartActionCell: React.FC<{
  productId: string;
  isActive: boolean;
  activeCellRef: React.RefObject<HTMLTableCellElement | null>;
  onClick: () => void;
  onRemove: (productId: string) => void;
}> = ({ productId, isActive, activeCellRef, onClick, onRemove }) => (
  <td
    ref={isActive ? activeCellRef : undefined}
    onClick={onClick}
    className={cn(
      'relative cursor-pointer border-b border-slate-200 py-0.5 text-center align-middle dark:border-slate-700/80',
      isActive &&
        'z-10 bg-rose-50/50 ring-2 ring-inset ring-rose-500 dark:bg-rose-950/30 dark:ring-rose-400'
    )}
  >
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onRemove(productId);
      }}
      className="mx-auto flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
      title="حذف من السلة (Del)"
    >
      <Trash2 size={11} />
    </button>
    {isActive && (
      <span className="rounded-xs pointer-events-none absolute -bottom-1 -left-1 z-20 h-2 w-2 bg-rose-500" />
    )}
  </td>
);

const CartIndexCell: React.FC<{
  rowIdx: number;
  isRowActive: boolean;
  onClick: () => void;
}> = ({ rowIdx, isRowActive, onClick }) => (
  <td
    onClick={onClick}
    className={cn(
      'cursor-pointer select-none border-b border-l border-slate-200 py-1 text-center font-mono text-[10px] dark:border-slate-700/80',
      isRowActive
        ? 'bg-blue-600 font-black text-white dark:bg-blue-600'
        : 'bg-slate-100/80 font-bold text-slate-500 dark:bg-slate-850 dark:text-slate-400'
    )}
  >
    {rowIdx + 1}
  </td>
);

export const ExcelCartTableRow: React.FC<ExcelCartTableRowProps> = React.memo(props => {
  const {
    item,
    rowIdx,
    isRowActive,
    isCellActive,
    activeCellRef,
    isCrossBranch,
    isEditingQty,
    qtyInputValue,
    handlers,
  } = props;
  const { totalAvailable, isOverStock, isLowStock } = getStockStatus(item);

  return (
    <tr className={getRowClassName(isRowActive, isOverStock, isCrossBranch)}>
      <CartIndexCell
        rowIdx={rowIdx}
        isRowActive={isRowActive}
        onClick={() => {
          handlers.onCellClick(1);
        }}
      />
      <CartProductNameCell
        name={item.name}
        isOverStock={isOverStock}
        isLowStock={isLowStock}
        totalAvailable={totalAvailable}
        isActive={isCellActive(1)}
        activeCellRef={activeCellRef}
        onClick={() => {
          handlers.onCellClick(1);
        }}
      />
      <CartPartNumberCell
        partNumber={item.partNumber}
        sku={item.sku}
        isActive={isCellActive(2)}
        activeCellRef={activeCellRef}
        onClick={() => {
          handlers.onCellClick(2);
        }}
      />
      <CartQuantityCell
        item={item}
        isActive={isCellActive(3)}
        activeCellRef={activeCellRef}
        isEditingQty={isEditingQty}
        qtyInputValue={qtyInputValue}
        handlers={handlers}
      />
      <CartPriceCell
        item={item}
        rowIdx={rowIdx}
        isActive={isCellActive(4)}
        activeCellRef={activeCellRef}
        handlers={handlers}
      />
      <CartTotalCell
        total={item.price * item.quantity}
        isActive={isCellActive(5)}
        activeCellRef={activeCellRef}
        onClick={() => {
          handlers.onCellClick(5);
        }}
      />
      <CartActionCell
        productId={item.productId}
        isActive={isCellActive(6)}
        activeCellRef={activeCellRef}
        onClick={() => {
          handlers.onCellClick(6);
        }}
        onRemove={handlers.onRemoveClick}
      />
    </tr>
  );
});

ExcelCartTableRow.displayName = 'ExcelCartTableRow';
