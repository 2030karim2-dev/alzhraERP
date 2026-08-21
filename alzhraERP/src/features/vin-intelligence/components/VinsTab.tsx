import React, { useEffect, useState } from 'react';
import { Car, PackagePlus, Search, Plus } from 'lucide-react';
import Card from '../../../ui/base/Card';
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
    return <Card isMicro><p className="text-[10px] text-[var(--app-text-secondary)]">جارٍ تحميل الشواصي...</p></Card>;
  }

  if (savedVins.length === 0) {
    return (
      <Card isMicro className="text-center py-8">
        <Car size={24} className="text-[var(--app-text-secondary)] opacity-40 mx-auto mb-2" />
        <p className="text-[11px] font-bold text-[var(--app-text-secondary)]">
          لا توجد شواصي محفوظة — اذهب إلى تبويب «فك الشاصي» ثم اضغط زر الحفظ
        </p>
      </Card>
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
    // Refresh linked parts — newly created products are now linked to this vehicle.
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
    { header: 'رقم القطعة', accessor: (r) => <span className="font-mono text-[10px]">{r.partNumber || '—'}</span>, width: '140px' },
    { header: 'الوصف', accessor: (r) => <span className="text-[10px]">{r.description ?? '—'}</span> },
    { header: 'المصنع', accessor: (r) => <span className="text-[10px]">{r.manufacturer ?? '—'}</span>, width: '90px' },
    {
      header: 'المصدر',
      accessor: (r) => (
        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
          {r.source === 'megazip' ? 'megazip' : 'يدوي'}
        </span>
      ),
      width: '80px',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      <div className="lg:col-span-1">
        <Card isMicro className="p-1.5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] px-1 mb-1">
            الشواصي المحفوظة ({savedVins.length})
          </h3>
          <div className="space-y-0.5">
            {savedVins.map((v) => {
              const info = v.decoded as VehicleInfo | null;
              const isActive = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => { handleSelect(v); }}
                  className={cn(
                    'w-full text-right px-2 py-1.5 rounded-lg border transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-[var(--app-bg)] border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]',
                  )}
                >
                  <span className="block font-mono text-[10px] font-bold">{v.vin}</span>
                  <span className={cn('block text-[9px]', isActive ? 'text-blue-100' : 'text-[var(--app-text-secondary)]')}>
                    {info?.make ?? ''} {info?.model ?? ''} {info?.year ? String(info.year) : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-2">
        {selected && vehicle ? (
          <>
            <Card isMicro>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Car size={14} className="text-blue-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
                    {vehicle.make} {vehicle.model ?? ''} {vehicle.year ? String(vehicle.year) : ''}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[var(--app-text-secondary)]">{selected.vin}</span>
                  {onOpenInExtract && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => { onOpenInExtract(selected); }}
                      className="text-[9px] font-black px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700"
                    >
                      إدارة في جدول القطع الذكي (Excel) ⚡
                    </Button>
                  )}
                </div>
              </div>
              {(vehicle.displacement || vehicle.cylinders || vehicle.fuelType || vehicle.driveType || vehicle.transmission || vehicle.market) && (
                <div className="flex flex-wrap gap-1.5 mt-2 text-[9px] text-[var(--app-text-secondary)]">
                  {vehicle.displacement && <span className="px-1.5 py-0.5 rounded bg-slate-100">المكينة {vehicle.displacement} لتر</span>}
                  {vehicle.cylinders && <span className="px-1.5 py-0.5 rounded bg-slate-100">{vehicle.cylinders} سلندر</span>}
                  {vehicle.fuelType && <span className="px-1.5 py-0.5 rounded bg-slate-100">{fuelLabel(vehicle.fuelType)}</span>}
                  {vehicle.driveType && <span className="px-1.5 py-0.5 rounded bg-slate-100">{driveLabel(vehicle.driveType)}</span>}
                  {vehicle.transmission && <span className="px-1.5 py-0.5 rounded bg-slate-100">{transLabel(vehicle.transmission)}</span>}
                  {vehicle.market && <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">وارد {vehicle.market}</span>}
                </div>
              )}
              {linkedParts.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {linkedParts.map((l) => (
                    <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                      {l.product_id.slice(0, 8)}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            <Card isMicro>
              <div className="flex flex-wrap items-end gap-1.5">
                <div className="flex-1 min-w-[140px]">
                  <Input variant="micro" label="بحث حقيقي برقم القطعة (megazip)" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="مثال: 04465-0K090" />
                </div>
                <Button size="sm" variant="secondary" onClick={handleSearch} isLoading={isSearching} disabled={searchQuery.trim().length < 3}>
                  <Search size={14} className="ml-1" /> بحث
                </Button>
              </div>
              <div className="flex flex-wrap items-end gap-1.5 mt-1.5">
                <div className="flex-1 min-w-[120px]">
                  <Input variant="micro" label="رقم قطعة (يدوي)" value={manualNumber} onChange={(e) => { setManualNumber(e.target.value); }} placeholder="رقم OEM" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Input variant="micro" label="الوصف" value={manualDesc} onChange={(e) => { setManualDesc(e.target.value); }} placeholder="وصف القطعة" />
                </div>
                <Button size="sm" variant="outline" onClick={addManual}>
                  <Plus size={14} className="ml-1" /> إضافة يدوية
                </Button>
              </div>
            </Card>

            {parts.length > 0 && (
              <>
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
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-[var(--app-text-secondary)]">تم تحديد {selectedIds.size} من {parts.length}</p>
                  {canAdd === false ? (
                    <p className="text-[10px] text-[var(--app-text-secondary)] font-semibold">
                      تتطلب إضافة القطع للمخزون صلاحية مدير
                    </p>
                  ) : (
                    <Button size="sm" variant="success" onClick={handleAdd} isLoading={isAdding} disabled={selectedIds.size === 0}>
                      <PackagePlus size={14} className="ml-1" /> إضافة المحدد للمخزون
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <Card isMicro className="text-center py-8">
            <p className="text-[11px] font-bold text-[var(--app-text-secondary)]">اختر شاصي من القائمة لعرض تفاصيله وإضافة القطع</p>
          </Card>
        )}
      </div>
    </div>
  );
};
