import React from 'react';
import type { PurchaseInvoiceItem } from '../../store';
import type { Product } from '../../../inventory/types';
import { Settings } from 'lucide-react';
import { cn } from '../../../../core/utils';
import type { PurchaseNavigationField } from './usePurchaseTableKeyboard';
import {
  PurchaseProductCell,
  PurchaseNumericCell,
  PurchaseTotalCell,
  PurchaseRemoveCell,
} from './PurchaseInvoiceCells';

type ColumnWidths = Record<string, number>;
interface TableHeaderProps {
  colWidths: ColumnWidths;
  showDiscount: boolean;
  onResizeMouseDown: (event: React.MouseEvent<HTMLElement>, field: string) => void;
}

const ResizeHandle: React.FC<{
  field: string;
  onResizeMouseDown: TableHeaderProps['onResizeMouseDown'];
}> = ({ field, onResizeMouseDown }) => (
  <button
    type="button"
    aria-label={`تغيير عرض عمود ${field}`}
    onMouseDown={event => {
      onResizeMouseDown(event, field);
    }}
    className="absolute left-0 top-0 z-20 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-300"
  />
);

export const PurchaseTableToolbar: React.FC<{
  discountEnabled: boolean;
  showDiscount: boolean;
  onToggleDiscount: () => void;
}> = ({ discountEnabled, showDiscount, onToggleDiscount }) => (
  <div className="flex justify-end gap-2 border-b bg-blue-600 p-1.5 dark:border-slate-800 dark:bg-slate-950 max-md:gap-1 max-md:p-0.5">
    <div className="flex rounded-none border border-white/20 bg-white/10 p-0.5">
      {discountEnabled && (
        <button
          onClick={onToggleDiscount}
          className={cn(
            'px-3 py-1 text-[10px] font-bold uppercase transition-all max-md:px-1.5 max-md:py-0.5 max-md:text-[10px]',
            showDiscount ? 'bg-white text-blue-600' : 'text-blue-100'
          )}
        >
          إظهار الخصم
        </button>
      )}
    </div>
    <div className="p-1.5 text-white/50 max-md:p-0.5">
      <Settings size={14} className="max-md:h-3 max-md:w-3" />
    </div>
  </div>
);

export const PurchaseTableHeader: React.FC<TableHeaderProps> = ({
  colWidths,
  showDiscount,
  onResizeMouseDown,
}) => (
  <thead>
    <tr className="bg-blue-600 text-right text-xs font-bold uppercase tracking-wider text-white max-md:text-[11px]">
      <th
        style={{ width: colWidths.index }}
        className="relative border-l border-white/10 p-2.5 text-center max-md:hidden max-md:p-1"
      >
        #
      </th>
      <th
        style={{ width: colWidths.name }}
        className="relative border-l border-white/10 p-2.5 pr-4 max-md:!w-[34%] max-md:p-0.5 max-md:pr-1"
      >
        وصف الصنف المورد <ResizeHandle field="name" onResizeMouseDown={onResizeMouseDown} />
      </th>
      <th
        style={{ width: colWidths.partNumber }}
        className="relative border-l border-white/10 p-2.5 text-center max-md:hidden max-md:p-1"
      >
        رقم القطعة <ResizeHandle field="partNumber" onResizeMouseDown={onResizeMouseDown} />
      </th>
      <th
        style={{ width: colWidths.brand }}
        className="relative border-l border-white/10 p-2.5 text-center max-md:hidden max-md:p-1"
      >
        الشركة الصانعة <ResizeHandle field="brand" onResizeMouseDown={onResizeMouseDown} />
      </th>
      <th
        style={{ width: colWidths.quantity }}
        className="relative border-l border-white/10 p-2.5 text-center max-md:!w-[16%] max-md:p-0.5"
      >
        الكمية <ResizeHandle field="quantity" onResizeMouseDown={onResizeMouseDown} />
      </th>
      <th
        style={{ width: colWidths.costPrice }}
        className="relative border-l border-white/10 p-2.5 text-center max-md:!w-[18%] max-md:p-0.5"
      >
        سعر التكلفة <ResizeHandle field="costPrice" onResizeMouseDown={onResizeMouseDown} />
      </th>
      {showDiscount && (
        <th
          style={{ width: colWidths.discount }}
          className="relative border-l border-white/10 p-2.5 text-center max-md:!w-[15%] max-md:p-0.5"
        >
          الخصم <ResizeHandle field="discount" onResizeMouseDown={onResizeMouseDown} />
        </th>
      )}
      <th
        style={{ width: colWidths.total }}
        className="relative p-2.5 pr-4 text-left max-md:!w-[18%] max-md:p-0.5 max-md:pr-1"
      >
        الإجمالي <ResizeHandle field="total" onResizeMouseDown={onResizeMouseDown} />
      </th>
      <th className="w-8 bg-blue-700 p-2.5 text-center max-md:w-6 max-md:p-0.5" />
    </tr>
  </thead>
);

interface TableBodyProps {
  items: PurchaseInvoiceItem[];
  showDiscount: boolean;
  onOpenSearch: (index: number, query?: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: PurchaseNavigationField
  ) => void;
  onUpdate: (index: number, field: keyof PurchaseInvoiceItem, value: number) => void;
  onRemove: (index: number) => void;
}
export const PurchaseTableBody: React.FC<TableBodyProps> = ({
  items,
  showDiscount,
  onOpenSearch,
  onKeyDown,
  onUpdate,
  onRemove,
}) => (
  <tbody className="divide-y dark:divide-slate-800">
    {items.map((item, index) => (
      <tr
        key={item.id}
        className="group h-11 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/5 max-md:h-8"
      >
        <td className="border-l p-2 text-center font-mono text-xs font-bold text-blue-300 dark:border-slate-800 max-md:hidden max-md:p-1">
          {index + 1}
        </td>
        <PurchaseProductCell
          item={item}
          index={index}
          onOpenSearch={onOpenSearch}
          onKeyDown={onKeyDown}
        />
        <td className="p-2 text-center font-mono text-xs font-bold text-gray-500 max-md:hidden max-md:p-1">
          {item.partNumber || '---'}
        </td>
        <td className="p-2 text-center text-xs font-bold text-blue-600 max-md:hidden max-md:p-1">
          {item.brand || '---'}
        </td>
        <PurchaseNumericCell
          value={item.quantity}
          field="quantity"
          index={index}
          onChange={onUpdate}
          onKeyDown={onKeyDown}
          placeholder="0"
          className="text-gray-900 focus:bg-blue-50 dark:text-white dark:focus:bg-slate-800"
        />
        <PurchaseNumericCell
          value={item.costPrice}
          field="costPrice"
          index={index}
          onChange={onUpdate}
          onKeyDown={onKeyDown}
          placeholder="0.00"
          className="text-rose-600 focus:bg-rose-50 dark:text-rose-400 dark:focus:bg-slate-800"
        />
        {showDiscount && (
          <PurchaseNumericCell
            value={item.discount}
            field="discount"
            index={index}
            onChange={onUpdate}
            onKeyDown={onKeyDown}
            className="text-amber-600 focus:bg-amber-50 dark:focus:bg-slate-800"
          />
        )}
        <PurchaseTotalCell
          item={item}
          index={index}
          showDiscount={showDiscount}
          onChange={onUpdate}
          onKeyDown={onKeyDown}
        />
        <PurchaseRemoveCell
          onRemove={() => {
            onRemove(index);
          }}
        />
      </tr>
    ))}
  </tbody>
);

export type PurchaseProductSelectionHandler = (product: Product) => void;
