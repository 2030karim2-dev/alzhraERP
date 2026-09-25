/* eslint-disable max-lines-per-function -- form group with multiple OEM and manual inputs */
import React from 'react';
import { Search, ExternalLink, Plus } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import Input from '../../../../ui/base/Input';
import { openCatalogSearch } from '../../constants/catalogs';

export interface CatalogSearchFormProps {
  vin?: string | null | undefined;
  selectedCatalogId: string;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  manualNumber: string;
  onManualNumberChange: (n: string) => void;
  manualDesc: string;
  onManualDescChange: (d: string) => void;
  onAddManual: () => void;
}

export const CatalogSearchForm: React.FC<CatalogSearchFormProps> = ({
  vin,
  selectedCatalogId,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  manualNumber,
  onManualNumberChange,
  manualDesc,
  onManualDescChange,
  onAddManual,
}) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
    <div className="flex items-end gap-2 md:col-span-7">
      <div className="flex-1">
        <Input
          label="بحث OEM برقم القطعة"
          value={searchQuery}
          onChange={e => {
            onSearchQueryChange(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') onSearch();
          }}
          placeholder="رقم القطعة OEM..."
        />
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={onSearch}
        isLoading={isSearching}
        disabled={searchQuery.trim().length < 3}
        className="rounded-xl font-bold"
        title="بحث واستخراج القطعة تلقائياً"
      >
        <Search size={13} className="ml-1" /> بحث واستخراج
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          openCatalogSearch(selectedCatalogId, searchQuery !== '' ? searchQuery : (vin ?? ''));
        }}
        className="rounded-xl border-blue-200 font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
        title="فتح نتيجة البحث في موقع الكتالوج مباشرة"
      >
        <ExternalLink size={13} className="ml-1" /> فتح في الكتالوج ↗
      </Button>
    </div>

    <div className="flex items-end gap-2 md:col-span-5">
      <div className="flex-1">
        <Input
          label="إضافة سريعة: رقم القطعة"
          value={manualNumber}
          onChange={e => {
            onManualNumberChange(e.target.value);
          }}
          placeholder="رقم القطعة..."
        />
      </div>
      <div className="flex-1">
        <Input
          label="الوصف"
          value={manualDesc}
          onChange={e => {
            onManualDescChange(e.target.value);
          }}
          placeholder="الوصف..."
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onAddManual}
        disabled={manualNumber.trim() === '' && manualDesc.trim() === ''}
        className="rounded-xl font-bold"
      >
        <Plus size={13} className="ml-1" /> إضافة
      </Button>
    </div>
  </div>
);
