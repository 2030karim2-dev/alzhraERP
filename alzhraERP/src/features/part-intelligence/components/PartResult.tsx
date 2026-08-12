/**
 * PartResult — Displays part search results.
 */
import React from 'react';
import type { PartSearchResultWithInventory } from '../types/models';

interface PartResultProps {
  result: PartSearchResultWithInventory;
  vin?: string;
  vehicleInfo?: { make: string; model: string; year?: number };
  onPartSelected?: (part: PartSearchResultWithInventory) => void;
}

export const PartResult: React.FC<PartResultProps> = ({ result, vehicleInfo, onPartSelected }) => {
  const fe = result.fitmentEvidence;

  return (
    <div className="flex flex-col gap-3">
      {/* Part Identity */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white" dir="ltr">{result.part!.displayNumber}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{result.part!.manufacturer}</p>
            {result.part!.description && <p className="text-sm text-gray-500 mt-1">{result.part!.description}</p>}
          </div>
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700">{result.provider}</span>
        </div>
      </div>

      {/* Fitment Status */}
      {fe && (
        <div className={`p-3 rounded-lg border text-sm ${
          fe.status === 'CONFIRMED' ? 'bg-green-50 border-green-200 text-green-700'
          : fe.status === 'POSSIBLE' ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
          : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <div className="font-semibold">
            حالة التوافق: {fe.status === 'CONFIRMED' ? '✅ مؤكد' : fe.status === 'POSSIBLE' ? '⚠️ محتمل' : '❓ غير معروف'}
          </div>
          {fe.evidence && <p className="mt-1 opacity-80">{fe.evidence}</p>}
        </div>
      )}

      {vehicleInfo && !fe && (
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
          المركبة: {vehicleInfo.make} {vehicleInfo.model} {vehicleInfo.year || ''}
        </div>
      )}

      {/* Cross References */}
      {result.crossReferences.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">قطع بديلة ({result.crossReferences.length})</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {result.crossReferences.slice(0, 10).map((ref, i) => (
              <div key={i} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                <div>
                  <span className="font-mono" dir="ltr">{ref.displayNumber}</span>
                  <span className="text-gray-500 ml-2">{ref.manufacturer}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${ref.matchQuality === 'EXACT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {ref.matchQuality}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory */}
      {result.inventoryProducts.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">متوفر بالمخزون ({result.inventoryProducts.length})</h4>
          {result.inventoryProducts.slice(0, 5).map((inv, i) => (
            <div key={i} className="flex justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-sm">
              <span className="font-medium">{inv.productNameAr || inv.productName}</span>
              <div className="flex gap-3 text-xs">
                <span className="text-emerald-700">الكمية: {inv.quantity}</span>
                <span className="text-gray-600">{inv.price?.toLocaleString()} ريال</span>
              </div>
            </div>
          ))}
        </div>
      ) : result.part && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">⚠️ غير متوفرة بالمخزون</div>
      )}

      {onPartSelected && result.part && (
        <button onClick={() => onPartSelected(result)} className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          اختيار هذه القطعة
        </button>
      )}
    </div>
  );
};
