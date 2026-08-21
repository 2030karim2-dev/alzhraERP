import React, { useEffect, useState } from 'react';
import { Car, PackagePlus, Search, Plus } from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import ExcelTable, { type Column } from '../../../ui/common/ExcelTable';
import { cn } from '../../../core/utils';
import type { ExtractedPart, VehicleInfo, VehicleProductLink, VinAnalysisRecord } from '../types';
import { driveLabel, fuelLabel, transLabel } from '../utils/vehicleLabels';

type UiPart = ExtractedPart & { _key: string };

interface VinsTabProps {
  savedVins: VinAnalysisRecord[];
  isLoading: boolean;
  onLoadParts: (vehicleId: string) => Promise<VehicleProductLink[]>;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAddParts: (vehicle: VehicleInfo, parts: ExtractedPart[]) => Promise<number>;
  onOpenInExtract?: (record: VinAnalysisRecord) => void;
  isAdding: boolean;
  canAdd?: boolean;
}

export const VinsTab: React.FC<VinsTabProps> = ({
  savedVins,
  isLoading,
  onLoadParts,
  onSearchPart,
  isSearching,
  onAddParts,
  onOpenInExtract,
  isAdding,
  canAdd,
}) => {
  const [selected, setSelected] = useState<VinAnalysisRecord | null>(null);
  const [linkedParts, setLinkedParts] = useState<VehicleProductLink[]>([]);
  const [parts, setParts] = useState<UiPart[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const vehicle: VehicleInfo | null = selected ? ((selected.decoded as VehicleInfo) ?? null) : null;

  useEffect(() => {
    let active = true;
    setLinkedParts([]);
    if (selected?.vehicle_id) {
      onLoadParts(selected.vehicle_id)
        .then((rows) => { if (active) setLinkedParts(rows); })
        .catch(() => { if (active) setLinkedParts([]); });
    }
    return () => { active = false; };
  }, [selected, onLoadParts]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">جارٍ تحميل الشواصي...</p>
      </div>
    );
  }

  if (savedVins.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center py-12 p-4 shadow-sm">
        <Car size={32} className="text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          لا توجد شواصي محفوظة — اذهب إلى تبويب «فك الشاصي» ثم اضغط زر الحفظ
        </p>
      </div>
    );
  }

  const handleSelect = (v: VinAnalysisRecord) => {
    setSelected(v);
    setParts([]);
    setSelectedIds(new Set());
    setSearchQuery('');
    setManualNumber('');
    setManualDesc('');
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;
    const res = await onSearchPart(q);
    if (res.length > 0) {
      setParts((prev) => [...prev, ...res.map((p, i) => ({ ...p, _key: `${p.partNumber || 'mz'}-${i}-${Date.now()}` }))]);
      setSearchQuery('');
    }
  };

  const addManual = () => {
    if (!manualNumber.trim() && !manualDesc.trim()) return;
    const desc = manualDesc.trim();
    const newPart: UiPart = { partNumber: manualNumber.trim(), source: 'manual', _key: `manual-${Date.now()}` };
    if (desc) newPart.description = desc;
    setParts((prev) => [...prev, newPart]);
    setManualNumber('');
    setManualDesc('');
  };

  const handleAdd = async () => {
    if (!vehicle || selectedIds.size === 0) return;
    await onAddParts(vehicle, parts.filter((p) => selectedIds.has(p._key)).map(({ _key: _k, ...p }) => p));
    setSelectedIds(new Set());
    if (selected?.vehicle_id) {
      try {
        const rows = await onLoadParts(selected.vehicle_id);
        setLinkedParts(rows);
      } catch {
        /* ignore */
      }
    }
  };

  const columns: Array<Column<UiPart>> = [
    { header: 'رقم القطعة', accessor: (r) => <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{r.partNumber || '—'}</span>, width: '140px' },
    { header: 'الوصف', accessor: (r) => <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{r.description ?? '—'}</span> },
    { header: 'المصنع', accessor: (r) => <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{r.manufacturer ?? '—'}</span>, width: '100px' },
    {
      header: 'المصدر',
      accessor: (r) => (
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
          {r.source === 'megazip' ? 'megazip' : 'يدوي'}
        </span>
      ),
      width: '90px',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 px-1 mb-2">
            الشواصي المحفوظة ({savedVins.length})
          </h3>
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {savedVins.map((v) => {
              const info = v.decoded as VehicleInfo | null;
              const isActive = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => { handleSelect(v); }}
                  className={cn(
                    'w-full text-right p-2.5 rounded-xl border transition-all',
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  <span className="block font-mono text-xs font-bold">{v.vin}</span>
                  <span className={cn('block text-[11px] font-medium mt-0.5', isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400')}>
                    {info?.make ?? ''} {info?.model ?? ''} {info?.year ? String(info.year) : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {selected && vehicle ? (
          <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    <Car size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {vehicle.make} {vehicle.model ?? ''} {vehicle.year ? String(vehicle.year) : ''}
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-slate-400">{selected.vin}</span>
                  </div>
                </div>
                <div>
                  {onOpenInExtract && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => { onOpenInExtract(selected); }}
                      className="text-xs font-bold rounded-lg shadow-sm"
                    >
                      إدارة في جدول القطع الذكي ⚡
                    </Button>
                  )}
                </div>
              </div>
              {(vehicle.displacement || vehicle.cylinders || vehicle.fuelType || vehicle.driveType || vehicle.transmission || vehicle.market) && (
                <div className="flex flex-wrap gap-1.5 mt-3 text-xs text-slate-600 dark:text-slate-300">
                  {vehicle.displacement && <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">المكينة {vehicle.displacement} لتر</span>}
                  {vehicle.cylinders && <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{vehicle.cylinders} سلندر</span>}
                  {vehicle.fuelType && <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{fuelLabel(vehicle.fuelType)}</span>}
                  {vehicle.driveType && <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{driveLabel(vehicle.driveType)}</span>}
                  {vehicle.transmission && <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{transLabel(vehicle.transmission)}</span>}
                  {vehicle.market && <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold">وارد {vehicle.market}</span>}
                </div>
              )}
              {linkedParts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 items-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">القطع المرتبطة بالمخزون:</span>
                  {linkedParts.map((l) => (
                    <span
                      key={l.id ?? l.product_id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    >
                      {l.product_id.slice(0, 8)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <Input label="بحث برقم القطعة (megazip)" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="مثال: 04465-0K090" />
                </div>
                <Button size="sm" variant="secondary" onClick={handleSearch} isLoading={isSearching} disabled={searchQuery.trim().length < 3} className="rounded-lg">
                  <Search size={14} className="ml-1" /> بحث
                </Button>
              </div>
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex-1 min-w-[120px]">
                  <Input label="رقم قطعة (يدوي)" value={manualNumber} onChange={(e) => { setManualNumber(e.target.value); }} placeholder="رقم OEM" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Input label="الوصف" value={manualDesc} onChange={(e) => { setManualDesc(e.target.value); }} placeholder="وصف القطعة" />
                </div>
                <Button size="sm" variant="outline" onClick={addManual} className="rounded-lg">
                  <Plus size={14} className="ml-1" /> إضافة يدوية
                </Button>
              </div>
            </div>

            {parts.length > 0 && (
              <div className="space-y-3">
                <ExcelTable
                  columns={columns}
                  data={parts}
                  title="القطع المراد إضافتها"
                  enableSelection
                  selectedRowIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  getRowId={(r) => r._key}
                  enablePagination={false}
                  showSearch={false}
                  colorTheme="indigo"
                  isRTL
                />
                <div className="flex items-center justify-between p-2">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">تم تحديد {selectedIds.size} من {parts.length}</p>
                  {canAdd === false ? (
                    <p className="text-xs text-slate-500 font-semibold">
                      تتطلب إضافة القطع للمخزون صلاحية مدير
                    </p>
                  ) : (
                    <Button size="sm" variant="success" onClick={handleAdd} isLoading={isAdding} disabled={selectedIds.size === 0} className="rounded-lg shadow-sm">
                      <PackagePlus size={14} className="ml-1" /> إضافة المحدد للمخزون
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center py-12 p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">اختر شاصي من القائمة لعرض تفاصيله وإضافة القطع</p>
          </div>
        )}
      </div>
    </div>
  );
};
