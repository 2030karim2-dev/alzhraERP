import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import StatementView from '../../parties/components/StatementView';

/**
 * Debt statements page — reuses the shared StatementView (Excel export,
 * tafqeet, print, WhatsApp share) scoped to customers.
 */
const StatementsPage: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--app-text-secondary)]">
      <FileSpreadsheet size={14} className="text-emerald-600" />
      اختر عميلاً لعرض كشف حسابه وتصديره (Excel) أو مشاركته عبر واتساب
    </div>
    <StatementView partyType="customer" />
  </div>
);

export default StatementsPage;
