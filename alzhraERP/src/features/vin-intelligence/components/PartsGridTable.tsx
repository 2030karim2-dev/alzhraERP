import React from 'react';
import { Sparkles, RefreshCw, Copy, Trash2, Plus, Check } from 'lucide-react';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import { useFeedbackStore } from '../../feedback/store';
import { generateSmartPartName } from '../utils/smartPartNamer';
import type { ExcelGridPart, VehicleInfo } from '../types';

interface PartsGridTableProps {
  rows: ExcelGridPart[];
  allSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onUpdateRow: (id: string, updates: Partial<ExcelGridPart>) => void;
  onDuplicateRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onInspectPart: (partNumber: string) => void;
  selectedRows: ExcelGridPart[];
  onAddRow: () => void;
  onSaveToInventory: () => void;
  canAdd?: boolean | undefined;
  isAdding: boolean;
  vehicle: VehicleInfo | null;
  customVehicleTemplate: string;
}

/* ──────────────────────────────────────────────────────────────────
   Small presentational pieces — each stays under the 50-line and
   complexity-10 ceilings enforced by the ESLint configuration.
   ────────────────────────────────────────────────────────────────── */

interface GridTextInputProps {
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}

const GridTextInput: React.FC<GridTextInputProps> = ({ value, placeholder = '', className = '', onChange }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => {
      onChange(e.target.value);
    }}
    onFocus={(e) => {
      e.target.select();
    }}
    placeholder={placeholder}
    className={`w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${className}`}
  />
);

interface GridNumberInputProps {
  value?: number | undefined;
  className?: string;
  onChange: (value: number) => void;
}

const GridNumberInput: React.FC<GridNumberInputProps> = ({ value, className = '', onChange }) => (
  <input
    type="number"
    min="0"
    step="any"
    value={value ?? ''}
    onChange={(e) => {
      onChange(parseFloat(e.target.value) || 0);
    }}
    onFocus={(e) => {
      e.target.select();
    }}
    placeholder="0.00"
    className={`w-full px-2 py-1.5 text-center font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${className}`}
  />
);

interface SmartNameCellProps {
  value?: string | undefined;
  onValueChange: (value: string) => void;
  onRegenerate: () => void;
}

const SmartNameCell: React.FC<SmartNameCellProps> = ({ value = '', onValueChange, onRegenerate }) => (
  <div className="relative flex items-center">
    <input
      type="text"
      value={value}
      onChange={(e) => {
        onValueChange(e.target.value);
      }}
      onFocus={(e) => {
      e.target.select();
    }}
      title={value}
      className="w-full px-2.5 py-1.5 font-bold text-xs text-slate-900 dark:text-blue-200 bg-blue-50/40 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
    />
    <button
      type="button"
      onClick={onRegenerate}
      className="absolute left-2 p-1 text-blue-500 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
      title="إعادة صياغة الاسم بناءً على التعميم المعتمد"
    >
      <RefreshCw size={12} />
    </button>
  </div>
);

interface RowActionsCellProps {
  partNumber: string;
  baseName: string;
  onInspect: (partNumber: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const RowActionsCell: React.FC<RowActionsCellProps> = ({ partNumber, baseName, onInspect, onDuplicate, onDelete }) => {
  const { showToast } = useFeedbackStore();
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => {
          const q = partNumber.trim() || baseName.trim();
          if (q) {
            onInspect(q);
          } else {
            showToast('يرجى كتابة رقم القطعة أو اسمها أولاً للفحص', 'warning');
          }
        }}
        className="p-1.5 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
        title="فحص بالذكاء الاصطناعي واستخراج البدائل والسيارات المتوافقة ونسبة الثقة"
      >
        <Sparkles size={13} />
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="تكرار السطر"
      >
        <Copy size={13} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        title="حذف السطر"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

interface PartsGridRowProps {
  row: ExcelGridPart;
  idx: number;
  onUpdate: (id: string, updates: Partial<ExcelGridPart>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onInspect: (partNumber: string) => void;
  onRegenerateName: (row: ExcelGridPart) => void;
}

const PartsGridRow: React.FC<PartsGridRowProps> = ({ row, idx, onUpdate, onDuplicate, onDelete, onInspect, onRegenerateName }) => (
  <tr className={cn('hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group', row.selected === true ? 'bg-blue-50/30 dark:bg-blue-950/30' : 'bg-[var(--app-surface)]')}>
    <td className="p-2 text-center">
      <input type="checkbox" checked={row.selected === true} onChange={(e) => { onUpdate(row._id, { selected: e.target.checked }); }} className="rounded text-blue-600 focus:ring-blue-500" />
    </td>
    <td className="p-2 text-center font-mono text-xs text-slate-400 font-bold">{idx + 1}</td>
    <td className="p-1.5">
      <GridTextInput value={row.partNumber} placeholder="رقم القطعة..." className="font-mono font-bold text-blue-600 dark:text-blue-400" onChange={(v) => { onUpdate(row._id, { partNumber: v }); }} />
    </td>
    <td className="p-1.5">
      <GridTextInput value={row.baseName} placeholder="مثال: بلاكات..." className="font-bold" onChange={(v) => { onUpdate(row._id, { baseName: v }); }} />
    </td>
    <td className="p-1.5">
      <SmartNameCell value={row.description} onValueChange={(v) => { onUpdate(row._id, { description: v }); }} onRegenerate={() => { onRegenerateName(row); }} />
    </td>
    <td className="p-1.5">
      <GridTextInput value={row.manufacturer ?? ''} className="font-medium" onChange={(v) => { onUpdate(row._id, { manufacturer: v }); }} />
    </td>
    <td className="p-1.5">
      <GridTextInput value={row.sizeSpec ?? ''} placeholder="المقاس..." onChange={(v) => { onUpdate(row._id, { sizeSpec: v }); }} />
    </td>
    <td className="p-1.5">
      <GridNumberInput value={row.purchasePrice} className="text-emerald-600 dark:text-emerald-400" onChange={(v) => { onUpdate(row._id, { purchasePrice: v }); }} />
    </td>
    <td className="p-1.5">
      <GridNumberInput value={row.salePrice} className="text-blue-600 dark:text-blue-400" onChange={(v) => { onUpdate(row._id, { salePrice: v }); }} />
    </td>
    <td className="p-1.5 text-center">
      <RowActionsCell partNumber={row.partNumber} baseName={row.baseName} onInspect={onInspect} onDuplicate={() => { onDuplicate(row._id); }} onDelete={() => { onDelete(row._id); }} />
    </td>
  </tr>
);


interface PartsGridHeaderProps {
  allSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
}

const PartsGridHeader: React.FC<PartsGridHeaderProps> = ({ allSelected, onToggleSelectAll }) => (
  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 select-none">
    <tr>
      <th className="p-2.5 text-center w-9">
        <input type="checkbox" checked={allSelected} onChange={(e) => { onToggleSelectAll(e.target.checked); }} className="rounded text-blue-600 focus:ring-blue-500" />
      </th>
      <th className="p-2.5 w-10 text-center text-slate-400">#</th>
      <th className="p-2.5 min-w-[130px]">رقم القطعة (OEM / Part No)</th>
      <th className="p-2.5 min-w-[120px]">نوع القطعة (الأولي)</th>
      <th className="p-2.5 min-w-[280px]">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-amber-500" />
          <span>اسم المنتج المكتمل (تلقائي / يدوي)</span>
        </div>
      </th>
      <th className="p-2.5 min-w-[100px]">الشركة الصانعة</th>
      <th className="p-2.5 min-w-[110px]">المقاس / المواصفات</th>
      <th className="p-2.5 min-w-[85px] text-center">سعر الشراء</th>
      <th className="p-2.5 min-w-[85px] text-center">سعر البيع</th>
      <th className="p-2.5 w-16 text-center">إجراءات</th>
    </tr>
  </thead>
);

interface PartsGridFooterProps {
  selectedCount: number;
  totalCount: number;
  canAdd?: boolean | undefined;
  isAdding: boolean;
  onAddRow: () => void;
  onSave: () => void;
}

const PartsGridFooter: React.FC<PartsGridFooterProps> = ({ selectedCount, totalCount, canAdd, isAdding, onAddRow, onSave }) => (
  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
        تم تحديد <strong className="text-blue-600 dark:text-blue-400 font-bold">{selectedCount}</strong> من أصل {totalCount} قطعة
      </span>
      <Button size="sm" variant="outline" onClick={onAddRow} className="text-xs font-bold rounded-lg">
        <Plus size={12} className="ml-1" /> إضافة سطر
      </Button>
    </div>
    <div className="flex items-center gap-2">
      {canAdd === false ? (
        <p className="text-xs text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
          تتطلب إضافة القطع للمخزون صلاحية مدير أو مسؤول
        </p>
      ) : (
        <Button
          size="md"
          variant="success"
          onClick={onSave}
          isLoading={isAdding}
          disabled={selectedCount === 0}
          className="font-bold px-5 bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-500/10"
        >
          <Check size={16} className="ml-1.5" /> حفظ وإضافة القطع المحددة ({selectedCount}) للمخزون
        </Button>
      )}
    </div>
  </div>
);

export const PartsGridTable: React.FC<PartsGridTableProps> = ({ rows, allSelected, onToggleSelectAll, onUpdateRow, onDuplicateRow, onDeleteRow, onInspectPart, selectedRows, onAddRow, onSaveToInventory, canAdd, isAdding, vehicle, customVehicleTemplate }) => {
  const regenerateName = (row: ExcelGridPart): void => {
    onUpdateRow(row._id, {
      description: generateSmartPartName(row.baseName || 'قطعة غيار', vehicle, {
        customVehicleTemplate: customVehicleTemplate.trim() || undefined,
      }),
    });
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-[var(--app-surface)] shadow-sm">
      <div className="overflow-x-auto max-h-[540px] custom-scrollbar">
        <table className="w-full text-right border-collapse text-xs">
          <PartsGridHeader allSelected={allSelected} onToggleSelectAll={onToggleSelectAll} />
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  لا توجد أسطر حالياً. انقر على «سطر جديد» أو «إضافة سريعة» للبدء.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <PartsGridRow
                  key={row._id}
                  row={row}
                  idx={idx}
                  onUpdate={onUpdateRow}
                  onDuplicate={onDuplicateRow}
                  onDelete={onDeleteRow}
                  onInspect={onInspectPart}
                  onRegenerateName={regenerateName}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <PartsGridFooter selectedCount={selectedRows.length} totalCount={rows.length} canAdd={canAdd} isAdding={isAdding} onAddRow={onAddRow} onSave={onSaveToInventory} />
    </div>
  );
};

