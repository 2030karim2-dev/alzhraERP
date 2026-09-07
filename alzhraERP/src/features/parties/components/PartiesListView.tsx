import React from 'react';
import type { Party, PartyType, PartyStats } from '../types';
import type { Column } from '../../../ui/common/ExcelTable';
import PartiesStats from './PartiesStats';
import ExcelTable from '../../../ui/common/ExcelTable';

interface PartiesListViewProps {
  partyType: PartyType;
  parties?: Party[];
  isLoading: boolean;
  stats?: PartyStats;
  columns: Array<Column<Party>>;
  onEdit: (party: Party) => void;
}

export const PartiesListView: React.FC<PartiesListViewProps> = ({
  partyType,
  parties,
  isLoading,
  stats,
  columns,
  onEdit,
}) => {
  return (
    <div className="animate-in fade-in space-y-4 duration-500">
      <PartiesStats
        stats={stats ?? { totalCount: 0, totalBalance: 0, activeCount: 0, blockedCount: 0 }}
        type={partyType}
      />

      <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
        <ExcelTable
          columns={columns}
          data={parties || []}
          colorTheme={partyType === 'customer' ? 'blue' : 'indigo'}
          isRTL={true}
          showSearch={false}
          isLoading={isLoading}
          onRowDoubleClick={row => {
            onEdit(row);
          }}
        />
      </div>
    </div>
  );
};

export default PartiesListView;
