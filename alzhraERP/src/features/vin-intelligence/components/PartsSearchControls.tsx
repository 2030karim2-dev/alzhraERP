import React, { useState } from 'react';
import { Globe, Search, ExternalLink, Plus, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';
import { AUTO_PARTS_CATALOGS, openCatalogSearch, openCatalogVinSearch } from '../constants/catalogs';
import type { VehicleInfo } from '../types';

interface PartsSearchControlsProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedCatalogId: string;
  onCatalogChange: (id: string) => void;
  isSearching: boolean;
  onSearch: () => void;
  vehicle: VehicleInfo | null;
  onAddRow: () => void;
  onAddMultipleRows: (count: number) => void;
}

/* ── Collapsed catalogs launcher ── */
interface CatalogsDrawerProps {
  searchQuery: string;
  onCatalogChange: (id: string) => void;
  vehicle: VehicleInfo | null;
}

const CatalogsDrawer: React.FC<CatalogsDrawerProps> = ({ searchQuery, onCatalogChange, vehicle }) => (
  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
    <span className="text-[11px] font-bold text-slate-400 shrink-0">فتح مباشر:</span>
    {AUTO_PARTS_CATALOGS.map((cat) => (
      <button
        key={cat.id}
        type="button"
        onClick={() => {
          onCatalogChange(cat.id);
          openCatalogSearch(cat.id, searchQuery || (vehicle?.vinPrefix ?? ''));
        }}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
          cat.colorClass.bg,
          cat.colorClass.text,
          cat.colorClass.border,
          cat.colorClass.hoverBg
        )}
        title={`${cat.description} — ${cat.nameEn}`}
      >
        <span>{cat.badge}</span>
        <ExternalLink size={10} className="opacity-70" />
      </button>
    ))}
    {vehicle?.vinPrefix != null && vehicle.vinPrefix !== '' && (
      <button
        type="button"
        onClick={() => { openCatalogVinSearch('partsouq', vehicle.vinPrefix ?? ''); }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
        title="فحص الشاصي في PartSouq"
      >
        🇦🇪 PartSouq ({vehicle.vinPrefix})
        <ExternalLink size={10} className="opacity-70" />
      </button>
    )}
  </div>
);

export const PartsSearchControls: React.FC<PartsSearchControlsProps> = ({
  searchQuery,
  onSearchQueryChange,
  selectedCatalogId,
  onCatalogChange,
  isSearching,
  onSearch,
  vehicle,
  onAddRow,
  onAddMultipleRows,
}) => {
  const [catalogsOpen, setCatalogsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
      {/* ── Header: title + catalog selector ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            بحث واستخراج قطع الغيار (OEM &amp; Aftermarket)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>الكتالوج:</span>
            <select
              value={selectedCatalogId}
              onChange={(e) => { onCatalogChange(e.target.value); }}
              className="px-2 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {AUTO_PARTS_CATALOGS.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nameAr}</option>
              ))}
            </select>
          </div>
          {/* Toggle catalogs drawer */}
          <button
            type="button"
            onClick={() => { setCatalogsOpen((o) => !o); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
              catalogsOpen
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600'
            }`}
            title="إظهار / إخفاء روابط الكتالوجات السريعة"
          >
            كتالوجات
            {catalogsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {/* ── Main search + add row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-5">
          <Input
            label="رقم القطعة OEM / Part Number"
            value={searchQuery}
            onChange={(e) => { onSearchQueryChange(e.target.value); }}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            placeholder="مثال: 90919-01253 أو 04465-42190..."
          />
        </div>
        <div className="lg:col-span-4 flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onSearch}
            isLoading={isSearching}
            disabled={searchQuery.trim().length < 3}
            className="flex-1 rounded-xl font-bold py-2"
            title="جلب بيانات القطعة وتفريغها في الجدول"
          >
            <Search size={14} className="ml-1" /> بحث واستخراج
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { openCatalogSearch(selectedCatalogId, searchQuery || (vehicle?.vinPrefix ?? '')); }}
            className="rounded-xl font-bold py-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            title="فتح في الكتالوج مباشرة"
          >
            <ExternalLink size={14} className="ml-1" /> فتح ↗
          </Button>
        </div>
        <div className="lg:col-span-3 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={onAddRow}
            className="bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl py-2"
          >
            <Plus size={14} className="ml-1" /> سطر جديد
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { onAddMultipleRows(5); }}
            className="font-bold text-xs rounded-xl py-2"
            title="إضافة 5 أسطر فارغة دفعة واحدة"
          >
            <Layers size={14} className="ml-1" /> +5 أسطر
          </Button>
        </div>
      </div>

      {/* ── Collapsible catalogs launcher ── */}
      {catalogsOpen && (
        <CatalogsDrawer
          searchQuery={searchQuery}
          onCatalogChange={onCatalogChange}
          vehicle={vehicle}
        />
      )}
    </div>
  );
};
