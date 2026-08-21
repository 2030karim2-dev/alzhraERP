import React, { useState, useEffect, useCallback } from 'react';
import { PackagePlus, Search, Plus, Sparkles, Trash2, Copy, RefreshCw, Car, Check, Layers } from 'lucide-react';
import Card from '../../../ui/base/Card';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';
import { generateSmartPartName } from '../utils/smartPartNamer';
import type { ExtractedPart, VehicleInfo } from '../types';

export interface ExcelGridPart extends ExtractedPart {
  _id: string;
  baseName: string;      // Initial input, e.g. 'بلاكات' or 'spark plug'
  sizeSpec?: string;     // المقاس والمواصفات
  selected?: boolean;
}

interface PartsExtractTabProps {
  hasVehicle: boolean;
  vehicle: VehicleInfo | null;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAdd: (parts: ExtractedPart[]) => Promise<number>;
  onNavigateToInventory?: () => void;
  isAdding: boolean;
  canAdd?: boolean;
}

/** Pre-defined common parts for rapid 1-click addition */
const QUICK_PARTS_TEMPLATES = [
  { base: 'بلاكات', oem: '', mfr: 'DENSO', spec: 'طقم 4 حبات' },
  { base: 'فحمات فرامل أمامية', oem: '', mfr: 'TOYOTA', spec: 'طقم أمامي' },
  { base: 'فحمات فرامل خلفية', oem: '', mfr: 'TOYOTA', spec: 'طقم خلفي' },
  { base: 'فلتر زيت', oem: '', mfr: 'TOYOTA', spec: 'سيفون أصلي' },
  { base: 'فلتر هواء', oem: '', mfr: 'TOYOTA', spec: 'فلتر شوية' },
  { base: 'فلتر مكيف', oem: '', mfr: 'TOYOTA', spec: 'فلتر صالون' },
  { base: 'مساعدات أمامية', oem: '', mfr: 'KYB', spec: 'يمين / يسار' },
  { base: 'دينمو', oem: '', mfr: 'DENSO', spec: '12V' },
  { base: 'سلف', oem: '', mfr: 'DENSO', spec: 'أصلي' },
  { base: 'سير مكينة', oem: '', mfr: 'BANDO', spec: '6PK' },
  { base: 'طرمبة ماء', oem: '', mfr: 'AISIN', spec: 'مع الوجوه' },
];

export const PartsExtractTab: React.FC<PartsExtractTabProps> = ({
  hasVehicle,
  vehicle,
  onSearchPart,
  isSearching,
  onAdd,
  onNavigateToInventory,
  isAdding,
  canAdd,
}) => {
  const [rows, setRows] = useState<ExcelGridPart[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastAddedCount, setLastAddedCount] = useState<number | null>(null);

  // Add initial empty row when vehicle is set and rows are empty
  useEffect(() => {
    if (vehicle && rows.length === 0) {
      setRows([
        createEmptyRow(vehicle, 'بلاكات', '90919-01164', 'DENSO', 'طقم 4 حبات'),
        createEmptyRow(vehicle, 'فحمات فرامل أمامية', '', 'TOYOTA', 'طقم أمامي'),
      ]);
    }
  }, [vehicle]);

  function createEmptyRow(
    veh: VehicleInfo | null,
    defaultBase = '',
    defaultPartNo = '',
    defaultMfr = 'GENUINE',
    defaultSpec = ''
  ): ExcelGridPart {
    const smartName = veh ? generateSmartPartName(defaultBase || 'قطعة غيار', veh) : defaultBase;
    return {
      _id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      partNumber: defaultPartNo,
      baseName: defaultBase,
      description: smartName,
      manufacturer: defaultMfr || veh?.make || '',
      sizeSpec: defaultSpec,
      source: 'manual',
      salePrice: 0,
      purchasePrice: 0,
      selected: true,
    };
  }

  // Update a single cell in the grid
  const updateRow = useCallback((id: string, updates: Partial<ExcelGridPart>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        const updated = { ...r, ...updates };

        // Auto-recalculate smart description if baseName was changed and description wasn't manually overridden
        if (updates.baseName !== undefined && vehicle) {
          updated.description = generateSmartPartName(updates.baseName, vehicle);
        }
        return updated;
      })
    );
  }, [vehicle]);

  const addRow = (template?: typeof QUICK_PARTS_TEMPLATES[0]) => {
    const newRow = createEmptyRow(
      vehicle,
      template?.base || '',
      template?.oem || '',
      template?.mfr || vehicle?.make || 'TOYOTA',
      template?.spec || ''
    );
    setRows((prev) => [...prev, newRow]);
  };

  const addMultipleRows = (count = 5) => {
    const newRows = Array.from({ length: count }, () => createEmptyRow(vehicle));
    setRows((prev) => [...prev, ...newRows]);
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  const duplicateRow = (id: string) => {
    const target = rows.find((r) => r._id === id);
    if (!target) return;
    const clone: ExcelGridPart = {
      ...target,
      _id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      selected: true,
    };
    setRows((prev) => [...prev, clone]);
  };

  // Batch regenerate all smart names based on active vehicle
  const regenerateAllNames = () => {
    if (!vehicle) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        description: generateSmartPartName(r.baseName || r.description || 'قطعة غيار', vehicle),
      }))
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleSearchMegazip = async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;
    const res = await onSearchPart(q);
    if (res.length > 0) {
      const newItems: ExcelGridPart[] = res.map((p) => {
        const smartName = vehicle
          ? generateSmartPartName(p.description || p.partNumber, vehicle)
          : (p.description || p.partNumber);

        return {
          _id: `mz-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          partNumber: p.partNumber,
          baseName: p.description || p.partNumber,
          description: smartName,
          manufacturer: p.manufacturer || vehicle?.make || '',
          source: 'megazip',
          salePrice: p.salePrice || 0,
          purchasePrice: p.purchasePrice || 0,
          selected: true,
        };
      });
      setRows((prev) => [...prev, ...newItems]);
      setSearchQuery('');
    }
  };

  const selectedRows = rows.filter((r) => r.selected);

  const handleSaveToInventory = async () => {
    if (selectedRows.length === 0) return;
    const partsToSave: ExtractedPart[] = selectedRows.map((r) => {
      let finalDescription = (r.description ?? '').trim() || r.baseName.trim() || 'قطعة غيار';
      if (r.sizeSpec?.trim() && !finalDescription.includes(r.sizeSpec.trim())) {
        finalDescription = `${finalDescription} - ${r.sizeSpec.trim()}`;
      }
      return {
        partNumber: r.partNumber.trim() || `PART-${Date.now().toString(36).toUpperCase()}`,
        description: finalDescription,
        manufacturer: r.manufacturer?.trim() || vehicle?.make || '',
        source: r.source || 'manual',
        salePrice: r.salePrice || 0,
        purchasePrice: r.purchasePrice || 0,
      };
    });

    const count = await onAdd(partsToSave);
    setLastAddedCount(count);
  };

  if (!hasVehicle || !vehicle) {
    return (
      <Card isMicro className="text-center py-10">
        <PackagePlus size={28} className="text-indigo-600 opacity-50 mx-auto mb-2" />
        <h3 className="text-[12px] font-black text-[var(--app-text)] mb-1">
          لم يتم تحديد السيارة بعد
        </h3>
        <p className="text-[10px] text-[var(--app-text-secondary)] max-w-md mx-auto">
          يرجى فك رقم الشاصي (VIN) أو إدخال بيانات ومواصفات السيارة في تبويب «فك الشاصي» لتتمكن من إضافة القطع والتسمية التلقائية.
        </p>
      </Card>
    );
  }

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <div className="space-y-2 font-cairo">
      {/* ── Active Vehicle Context Banner ── */}
      <Card isMicro className="bg-indigo-50/70 border-indigo-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
              <Car size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-indigo-700">السيارة النشطة لإضافة القطع وتوليد الأسماء:</p>
              <h4 className="text-[12px] font-black text-indigo-950">
                {vehicle.make} {vehicle.model ?? ''}{' '}
                {vehicle.yearStart && vehicle.yearEnd ? `(${vehicle.yearStart}-${vehicle.yearEnd})` : vehicle.year ? `(${vehicle.year})` : ''}{' '}
                {vehicle.market ? `[${vehicle.market}]` : ''}{' '}
                {vehicle.transmission ? `[${vehicle.transmission}]` : ''}{' '}
                {vehicle.displacement ? `[مكينة ${vehicle.displacement}]` : ''}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={regenerateAllNames}
              className="bg-white border-indigo-300 text-indigo-800 text-[9px] font-bold hover:bg-indigo-100"
              title="إعادة صياغة أسماء جميع القطع بالجدول بناءً على مواصفات هذه السيارة"
            >
              <Sparkles size={11} className="ml-1 text-indigo-600" />
              تحديث الأسماء الذكية
            </Button>
          </div>
        </div>
      </Card>

      {/* Success Notification Alert */}
      {lastAddedCount !== null && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2 text-emerald-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              ✓
            </div>
            <p className="text-[11px] font-black">
              تم بنجاح إضافة وتحديث <span className="underline decoration-2">{lastAddedCount}</span> قطعة في المخزون وشبكة التوافق لهذه المركبة!
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onNavigateToInventory && (
              <Button
                size="sm"
                variant="success"
                onClick={onNavigateToInventory}
                className="text-[9px] font-black px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800"
              >
                عرض في المخزون المتطابق →
              </Button>
            )}
            <button
              onClick={() => { setLastAddedCount(null); }}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Search & Add Controls ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {/* Quick OEM search from Megazip */}
        <Card isMicro>
          <div className="flex items-end gap-1.5">
            <div className="flex-1">
              <Input
                variant="micro"
                label="بحث OEM من الكتالوج (Megazip)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchMegazip()}
                placeholder="مثال: 90919-01164 أو 04465-0K090"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSearchMegazip}
              isLoading={isSearching}
              disabled={searchQuery.trim().length < 3}
            >
              <Search size={13} className="ml-1" /> بحث واستخراج
            </Button>
          </div>
        </Card>

        {/* Quick Row insertion actions */}
        <Card isMicro>
          <div className="flex flex-wrap items-center justify-between h-full gap-1">
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="primary" onClick={() => { addRow(); }} className="bg-indigo-600 hover:bg-indigo-700 font-bold text-[10px]">
                <Plus size={13} className="ml-1" /> سطر جديد
              </Button>
              <Button size="sm" variant="outline" onClick={() => { addMultipleRows(5); }} className="font-bold text-[10px]">
                <Layers size={13} className="ml-1" /> +5 أسطر
              </Button>
            </div>
            <span className="text-[9px] text-[var(--app-text-secondary)] font-bold">
              إجمالي الأسطر: {rows.length}
            </span>
          </div>
        </Card>
      </div>

      {/* ── Quick Templates Chips ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
        <span className="text-[9px] font-black text-[var(--app-text-secondary)] shrink-0">إضافة سريعة:</span>
        {QUICK_PARTS_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.base}
            type="button"
            onClick={() => { addRow(tmpl); }}
            className="shrink-0 px-2 py-0.5 text-[9px] font-bold rounded-full bg-[var(--app-bg-surface)] border border-[var(--app-border)] hover:border-indigo-500 hover:text-indigo-600 transition-colors"
          >
            + {tmpl.base}
          </button>
        ))}
      </div>

      {/* ── Professional Excel Grid Table ── */}
      <div className="border border-[var(--app-border)] rounded-lg overflow-hidden bg-[var(--app-surface)] shadow-sm">
        <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
          <table className="w-full text-right border-collapse text-[10px]">
            <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 z-10 border-b border-[var(--app-border)] select-none">
              <tr>
                <th className="p-1.5 text-center w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => { toggleSelectAll(e.target.checked); }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-1.5 w-10 text-center text-slate-500">#</th>
                <th className="p-1.5 min-w-[130px]">رقم القطعة (OEM / Part No)</th>
                <th className="p-1.5 min-w-[120px]">نوع القطعة (الأولي)</th>
                <th className="p-1.5 min-w-[240px]">
                  <div className="flex items-center gap-1">
                    <Sparkles size={11} className="text-indigo-600" />
                    <span>اسم المنتج المكتمل (تلقائي / ذكي)</span>
                  </div>
                </th>
                <th className="p-1.5 min-w-[100px]">الشركة الصانعة</th>
                <th className="p-1.5 min-w-[110px]">المقاس / المواصفات</th>
                <th className="p-1.5 min-w-[85px] text-center">سعر الشراء</th>
                <th className="p-1.5 min-w-[85px] text-center">سعر البيع</th>
                <th className="p-1.5 w-16 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[var(--app-text-secondary)]">
                    لا توجد أسطر حالياً. انقر على «سطر جديد» للبدء.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row._id}
                    className={cn(
                      'hover:bg-indigo-50/40 transition-colors group',
                      row.selected ? 'bg-indigo-50/20' : 'bg-[var(--app-bg)]'
                    )}
                  >
                    {/* Select Checkbox */}
                    <td className="p-1 text-center">
                      <input
                        type="checkbox"
                        checked={!!row.selected}
                        onChange={(e) => { updateRow(row._id, { selected: e.target.checked }); }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="p-1 text-center font-mono text-[9px] text-slate-500 font-bold">
                      {idx + 1}
                    </td>

                    {/* Part Number Input */}
                    <td className="p-1">
                      <input
                        type="text"
                        value={row.partNumber}
                        onChange={(e) => { updateRow(row._id, { partNumber: e.target.value }); }}
                        placeholder="90919-01164"
                        className="w-full px-2 py-1 font-mono font-bold text-[10px] bg-[var(--app-bg-surface)] border border-[var(--app-border)] rounded focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Base Name / Category Input */}
                    <td className="p-1">
                      <input
                        type="text"
                        value={row.baseName}
                        onChange={(e) => { updateRow(row._id, { baseName: e.target.value }); }}
                        placeholder="مثال: بلاكات، فحمات"
                        className="w-full px-2 py-1 font-bold text-[10px] bg-[var(--app-bg-surface)] border border-[var(--app-border)] rounded focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Auto-Completed Smart Product Name */}
                    <td className="p-1">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => { updateRow(row._id, { description: e.target.value }); }}
                          placeholder="الاسم التلقائي المكتمل للمنتج"
                          className="w-full px-2 py-1 font-bold text-[10px] text-indigo-950 bg-indigo-50/40 border border-indigo-200 rounded focus:outline-none focus:border-indigo-600 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (vehicle) {
                              updateRow(row._id, {
                                description: generateSmartPartName(row.baseName || 'قطعة غيار', vehicle),
                              });
                            }
                          }}
                          className="absolute left-1.5 p-0.5 text-indigo-500 hover:text-indigo-800 transition-colors"
                          title="إعادة صياغة الاسم الذكي تلقائياً"
                        >
                          <RefreshCw size={10} />
                        </button>
                      </div>
                    </td>

                    {/* Manufacturer / Brand */}
                    <td className="p-1">
                      <input
                        type="text"
                        value={row.manufacturer || ''}
                        onChange={(e) => { updateRow(row._id, { manufacturer: e.target.value }); }}
                        placeholder="DENSO / TOYOTA"
                        className="w-full px-2 py-1 font-bold text-[10px] bg-[var(--app-bg-surface)] border border-[var(--app-border)] rounded focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Size & Specification */}
                    <td className="p-1">
                      <input
                        type="text"
                        value={row.sizeSpec || ''}
                        onChange={(e) => { updateRow(row._id, { sizeSpec: e.target.value }); }}
                        placeholder="المقاس / المواصفات"
                        className="w-full px-2 py-1 text-[10px] bg-[var(--app-bg-surface)] border border-[var(--app-border)] rounded focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Purchase Price */}
                    <td className="p-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.purchasePrice || ''}
                        onChange={(e) => { updateRow(row._id, { purchasePrice: parseFloat(e.target.value) || 0 }); }}
                        placeholder="0.00"
                        className="w-full px-1.5 py-1 text-center font-mono font-bold text-[10px] bg-[var(--app-bg-surface)] border border-[var(--app-border)] rounded focus:outline-none focus:border-indigo-500 text-emerald-700"
                      />
                    </td>

                    {/* Sale Price */}
                    <td className="p-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.salePrice || ''}
                        onChange={(e) => { updateRow(row._id, { salePrice: parseFloat(e.target.value) || 0 }); }}
                        placeholder="0.00"
                        className="w-full px-1.5 py-1 text-center font-mono font-bold text-[10px] bg-[var(--app-bg-surface)] border border-[var(--app-border)] rounded focus:outline-none focus:border-indigo-500 text-blue-700"
                      />
                    </td>

                    {/* Actions (Delete, Duplicate) */}
                    <td className="p-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => { duplicateRow(row._id); }}
                          className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-200/50"
                          title="تكرار السطر"
                        >
                          <Copy size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { deleteRow(row._id); }}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-100/50"
                          title="حذف السطر"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Grid Footer & Batch Commit ── */}
        <div className="p-2.5 bg-slate-50 border-t border-[var(--app-border)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
              تم تحديد <strong className="text-indigo-700">{selectedRows.length}</strong> من أصل {rows.length} قطعة
            </span>
            <Button size="sm" variant="outline" onClick={() => { addRow(); }} className="text-[9px] font-bold">
              <Plus size={10} className="ml-1" /> إضافة سطر
            </Button>
          </div>

          {canAdd === false ? (
            <p className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200">
              تتطلب إضافة القطع للمخزون صلاحية مدير أو مسؤول
            </p>
          ) : (
            <Button
              size="sm"
              variant="success"
              onClick={handleSaveToInventory}
              isLoading={isAdding}
              disabled={selectedRows.length === 0}
              className="font-black px-4 bg-emerald-600 hover:bg-emerald-700"
            >
              <Check size={14} className="ml-1" /> حفظ وإضافة القطع المحددة ({selectedRows.length}) للمخزون
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
