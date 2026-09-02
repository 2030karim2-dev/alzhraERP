import React from 'react';
import { Send, Clock } from 'lucide-react';
import type { PublicPortalContext } from '../../types';

type RFQItem = PublicPortalContext['rfqs'][0];

interface RfqsListTabProps {
  rfqs: RFQItem[];
  onQuoteRfq: (rfq: RFQItem) => void;
}

const RfqItemsList: React.FC<{ items: RFQItem['items'] }> = ({ items }) => (
  <div className="space-y-1">
    <span className="text-[10px] font-bold text-slate-500">الأصناف المطلوبة:</span>
    <div className="divide-y divide-slate-800 rounded-xl border border-slate-800/80 bg-slate-950/40 text-xs">
      {items?.map(it => {
        const uom =
          typeof it.unit_of_measure === 'string' && it.unit_of_measure.length > 0
            ? it.unit_of_measure
            : 'قطعة';
        return (
          <div key={it.id} className="flex items-center justify-between p-2">
            <span className="font-bold text-white">{it.description}</span>
            <span className="font-mono text-blue-400">
              {it.quantity} {uom}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

interface SingleRfqCardProps {
  rfq: RFQItem;
  onQuoteRfq: (rfq: RFQItem) => void;
}

const SingleRfqCard: React.FC<SingleRfqCardProps> = ({ rfq, onQuoteRfq }) => {
  const deadline = rfq.submission_deadline;
  const terms = rfq.terms_and_conditions;
  const hasDeadline = typeof deadline === 'string' && deadline.length > 0;
  const hasTerms = typeof terms === 'string' && terms.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-blue-500/40">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-blue-400">{rfq.rfq_number}</span>
        <span className="rounded-md bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-300">
          طلب نشط
        </span>
      </div>

      <h3 className="text-sm font-black text-white">{rfq.title}</h3>

      <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400">
        {hasDeadline && (
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-amber-400" />
            <span>الموعد النهائي: {new Date(deadline).toLocaleDateString('ar-SA')}</span>
          </div>
        )}
        {hasTerms && <p className="line-clamp-2 text-slate-500">{terms}</p>}
      </div>

      <RfqItemsList items={rfq.items} />

      <button
        type="button"
        onClick={() => {
          onQuoteRfq(rfq);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-black text-white transition-all hover:bg-blue-500"
      >
        <Send size={14} />
        <span>تقديم عرض سعر لهذا الطلب</span>
      </button>
    </div>
  );
};

export const RfqsListTab: React.FC<RfqsListTabProps> = ({ rfqs, onQuoteRfq }) => {
  if (rfqs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-500">
        لا توجد طلبات تسعير نشطة موجهة إليكم حالياً
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {rfqs.map(rfq => (
        <SingleRfqCard key={rfq.id} rfq={rfq} onQuoteRfq={onQuoteRfq} />
      ))}
    </div>
  );
};
