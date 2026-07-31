
import React from 'react';
import { useTranslation } from '../../lib/hooks/useTranslation';

interface TopCustomersTableProps {
  customers: { name: string; inv: number; amt: string }[];
}

const TopCustomersTable: React.FC<TopCustomersTableProps> = ({ customers }) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-center">
        <thead className="border-b border-gray-200 dark:border-slate-700">
          <tr>
            <th className="p-3 font-bold text-[var(--app-text-secondary)]">{t('name')}</th>
            <th className="p-3 font-bold text-[var(--app-text-secondary)]">{t('invoices')}</th>
            <th className="p-3 font-bold text-[var(--app-text-secondary)]">{t('amount')}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c, index) => (
            <tr key={index} className="border-b border-[var(--app-border)] last:border-0">
              <td className="p-3 font-medium text-[var(--app-text)]">{c.name}</td>
              <td className="p-3 text-[var(--app-text-secondary)]">{c.inv}</td>
              <td className="p-3 font-bold text-brand-green">{c.amt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopCustomersTable;