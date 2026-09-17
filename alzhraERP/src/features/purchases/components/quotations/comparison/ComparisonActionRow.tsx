import React from 'react';
import { ActionCell } from './ActionCell';
import type { ComparisonSupplier } from '../../../services/quotationComparison';

interface ComparisonActionRowProps {
  suppliers: ComparisonSupplier[];
  cheapestId: string;
  actionLoading: string | null;
  onConvert: (id: string) => Promise<void>;
}

/** صف الإجراء: زر اعتماد عرض كل مورد / حالة التحويل. */
export const ComparisonActionRow = ({
  suppliers,
  cheapestId,
  actionLoading,
  onConvert,
}: ComparisonActionRowProps): React.ReactElement => (
  <tr className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10">
    <td className="sticky right-0 z-10 bg-violet-50 px-4 py-4 font-bold text-violet-700 dark:bg-violet-900/10 dark:text-violet-400">
      الإجراء
    </td>
    <td className="bg-violet-50 px-3 py-4 dark:bg-violet-900/10"></td>
    {suppliers.map(supplier => (
      <td key={supplier.id} className="px-4 py-4 text-center">
        <ActionCell
          supplier={supplier}
          cheapestId={cheapestId}
          actionLoading={actionLoading}
          onConvert={onConvert}
        />
      </td>
    ))}
  </tr>
);
