/* eslint-disable max-lines-per-function -- table component with header, rows, and footer actions */
import React from 'react';
import { PackagePlus } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { PartsListRow, type UiPart } from '../PartsListRow';
import { openCatalogSearch } from '../../constants/catalogs';

export interface ExtractedPartsTableProps {
  parts: UiPart[];
  selectedIds: Set<string>;
  selectedCatalogId: string;
  isAdding: boolean;
  canAdd?: boolean | undefined;
  onTogglePart: (key: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onInspectPart: (partNumber: string) => void;
  onAddSelectedParts: () => void;
}

export const ExtractedPartsTable: React.FC<ExtractedPartsTableProps> = ({
  parts,
  selectedIds,
  selectedCatalogId,
  isAdding,
  canAdd,
  onTogglePart,
  onToggleSelectAll,
  onInspectPart,
  onAddSelectedParts,
}) => {
  if (parts.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className="w-9 p-2.5 text-center">
                <input
                  type="checkbox"
                  checked={parts.length > 0 && selectedIds.size === parts.length}
                  onChange={e => {
                    onToggleSelectAll(e.target.checked);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="p-2.5">رقم القطعة</th>
              <th className="p-2.5">الوصف</th>
              <th className="p-2.5">المصنع</th>
              <th className="p-2.5 text-center">المصدر / الكتالوج</th>
              <th className="w-16 p-2.5 text-center">فحص</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {parts.map(p => (
              <PartsListRow
                key={p._key}
                part={p}
                isSelected={selectedIds.has(p._key)}
                catalogId={selectedCatalogId}
                onToggle={onTogglePart}
                onInspect={onInspectPart}
                onOpenCatalog={pn => {
                  openCatalogSearch(selectedCatalogId, pn);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500">
          المحدد: {selectedIds.size} من أصل {parts.length}
        </span>
        {canAdd === false ? (
          <p className="text-xs font-bold text-amber-600">تتطلب الإضافة صلاحية مدير</p>
        ) : (
          <Button
            size="sm"
            variant="success"
            onClick={onAddSelectedParts}
            isLoading={isAdding}
            disabled={selectedIds.size === 0}
            className="rounded-xl bg-emerald-600 font-bold hover:bg-emerald-700"
          >
            <PackagePlus size={13} className="ml-1" /> حفظ القطع المحددة في المخزون
          </Button>
        )}
      </div>
    </div>
  );
};
