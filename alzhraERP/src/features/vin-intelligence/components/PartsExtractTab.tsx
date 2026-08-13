import React, { useState } from 'react';
import { PackagePlus, Search, Plus } from 'lucide-react';
import Card from '../../../ui/base/Card';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import ExcelTable, { Column } from '../../../ui/common/ExcelTable';
import type { ExtractedPart, VehicleInfo } from '../types';

type UiPart = ExtractedPart & { _key: string };

interface PartsExtractTabProps {
  hasVehicle: boolean;
  vehicle: VehicleInfo | null;
  onSearchPart: (partNumber: string) => Promise<ExtractedPart[]>;
  isSearching: boolean;
  onAdd: (parts: ExtractedPart[]) => Promise<number>;
  isAdding: boolean;
}

export const PartsExtractTab: React.FC<PartsExtractTabProps> = ({
  hasVehicle,
  vehicle,
  onSearchPart,
  isSearching,
  onAdd,
  isAdding,
}) => {
  const [parts, setParts] = useState<UiPart[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualNumber, setManualNumber] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!hasVehicle || !vehicle) {
    return (
      <Card isMicro className="text-center py-8">
        <PackagePlus size={24} className="text-[var(--app-text-secondary)] opacity-40 mx-auto mb-2" />
        <p className="text-[11px] font-bold text-[var(--app-text-secondary)]">
          أدخل رقم الشاصي (VIN) في تبويب «فك الشاصي» أولاً لاستخراج القطع المتوافقة
        </p>
      </Card>
    );
  }

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
    const newPart: UiPart = {
      partNumber: manualNumber.trim(),
      source: 'manual',
      _key: `manual-${Date.now()}`,
    };
    if (desc) newPart.description = desc;
    setParts((prev) => [...prev, newPart]);
    setManualNumber('');
    setManualDesc('');
  };

  const selectedParts = parts.filter((p) => selected.has(p._key));

  const handleAdd = async () => {
    if (selectedParts.length === 0) return;
    await onAdd(selectedParts.map(({ _key: _k, ...p }) => p));
    setSelected(new Set());
  };

  const columns: Column<UiPart>[] = [
    {
      header: 'رقم القطعة',
      accessor: (r) => <span className="font-mono text-[10px]">{r.partNumber || '—'}</span>,
      width: '150px',
    },
    {
      header: 'الوصف',
      accessor: (r) => <span className="text-[10px]">{r.description ?? '—'}</span>,
    },
    {
      header: 'المصنع',
      accessor: (r) => <span className="text-[10px]">{r.manufacturer ?? '—'}</span>,
      width: '100px',
    },
    {
      header: 'المصدر',
      accessor: (r) => (
        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
          {r.source === 'megazip' ? 'megazip' : r.source === 'ai' ? 'ذكاء اصطناعي' : 'يدوي'}
        </span>
      ),
      width: '90px',
    },
  ];

  return (
    <div className="space-y-2">
      <Card isMicro>
        <div className="flex flex-wrap items-end gap-1.5">
          <div className="flex-1 min-w-[180px]">
            <Input
              variant="micro"
              label="بحث حقيقي برقم القطعة (megazip)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="مثال: 04465-0K090"
            />
          </div>
          <Button size="sm" variant="secondary" onClick={handleSearch} isLoading={isSearching} disabled={searchQuery.trim().length < 3}>
            <Search size={14} className="ml-1" /> بحث
          </Button>
        </div>
      </Card>

      <Card isMicro>
        <div className="flex flex-wrap items-end gap-1.5">
          <div className="flex-1 min-w-[120px]">
            <Input
              variant="micro"
              label="رقم قطعة (يدوي)"
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              placeholder="رقم OEM"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <Input
              variant="micro"
              label="الوصف"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="وصف القطعة"
            />
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
            title="القطع المستخرجة"
            enableSelection
            selectedRowIds={selected}
            onSelectionChange={setSelected}
            getRowId={(r) => r._key}
            enablePagination={false}
            showSearch={false}
            emptyMessage="لا توجد قطع"
            colorTheme="indigo"
            isRTL
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[var(--app-text-secondary)]">
              تم تحديد {selected.size} من {parts.length}
            </p>
            <Button
              size="sm"
              variant="success"
              onClick={handleAdd}
              isLoading={isAdding}
              disabled={selected.size === 0}
            >
              <PackagePlus size={14} className="ml-1" /> إضافة المحدد للمخزون
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
