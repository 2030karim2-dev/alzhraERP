import React from 'react';
import { Receipt, ExternalLink, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EntityCardMetadata } from '../../types';
import { formatCurrency } from '../../../../core/utils';

interface Props {
  metadata: EntityCardMetadata;
}

export const InvoiceCard: React.FC<Props> = ({ metadata }) => {
  const navigate = useNavigate();
  const details = metadata.details || {};

  const invoiceNumber = (details.invoice_number as string) || metadata.title;
  const customerName = (details.customer_name as string) || 'عميل نقدي';
  const total = Number(details.total || 0);
  const status = (details.status as string) || 'مؤكدة';

  const handleOpenInvoice = () => {
    navigate(`/sales?search=${encodeURIComponent(invoiceNumber)}`);
  };

  return (
    <div className="my-2 max-w-sm rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-sm transition-all hover:border-[var(--accent)]/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--app-border)]/60 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Receipt size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--app-text)]">{invoiceNumber}</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600">
                {status}
              </span>
            </div>
            <p className="text-xs text-[var(--app-text-secondary)]">فاتورة مبيعات</p>
          </div>
        </div>
        <button
          onClick={handleOpenInvoice}
          title="عرض الفاتورة"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--accent)]"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-[var(--app-bg)] p-2">
          <span className="flex items-center gap-1 text-[10px] text-[var(--app-text-secondary)]">
            <User size={10} /> العميل
          </span>
          <strong className="line-clamp-1 text-[var(--app-text)]">{customerName}</strong>
        </div>

        <div className="rounded-lg bg-[var(--app-bg)] p-2">
          <span className="text-[10px] text-[var(--app-text-secondary)]">الإجمالي</span>
          <div className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(total)}
          </div>
        </div>
      </div>
    </div>
  );
};
