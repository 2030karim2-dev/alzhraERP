/**
 * PartSearchPanel — Search automotive parts by OEM number.
 */
import React, { useState, useCallback } from 'react';
import { usePartSearch } from '../hooks/usePartSearch';
import { useAuthStore } from '../../auth/store';
import { PartResult } from './PartResult';
import type { PartSearchResultWithInventory } from '../types/models';

interface PartSearchPanelProps {
  vin?: string;
  vehicleInfo?: { make: string; model: string; year?: number };
  onPartSelected?: (part: PartSearchResultWithInventory) => void;
}

export const PartSearchPanel: React.FC<PartSearchPanelProps> = ({ vin, vehicleInfo, onPartSelected }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { result, isSearching, error, searchPart, reset } = usePartSearch();
  const companyId = useAuthStore(s => s.user?.company_id);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || !companyId) return;
    await searchPart(searchTerm.trim(), companyId, vin);
  }, [searchTerm, companyId, vin, searchPart]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
      <div className="flex gap-2">
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown} placeholder="أدخل رقم القطعة (OEM) ..."
          className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          dir="ltr" />
        <button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {isSearching ? 'جاري البحث...' : 'بحث'}
        </button>
        {result && <button onClick={reset} className="px-4 py-2 text-gray-500">✕</button>}
      </div>
      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      {result?.part && <PartResult result={result} vehicleInfo={vehicleInfo} vin={vin} onPartSelected={onPartSelected} />}
      {result && !result.part && !isSearching && <div className="p-4 text-center text-gray-500">لم يتم العثور على نتائج</div>}
    </div>
  );
};
