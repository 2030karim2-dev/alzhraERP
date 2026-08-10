import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { usePartyStatement } from '../hooks/useDebtQueries';
import { Download, FileText, Filter } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';

interface StatementRow {
  id: string; date: string; ref: string; desc: string;
  debit: number; credit: number; currency: string; balance: number; operation_type: string;
}

interface Props { partyId: string; partyName: string; currencyCode?: string; }

const StatementTable: React.FC<Props> = ({ partyId, partyName, currencyCode }) => {
  const { t } = useTranslation();
  const [fc, setFc] = useState(currencyCode || '');
  const [df, setDf] = useState('');
  const [dt, setDt] = useState('');

  const { data: rows, isLoading } = usePartyStatement(partyId);

  const filtered = useMemo(() => {
    let r = rows || [];
    if (fc) r = r.filter(row => row.currency === fc);
    if (df) r = r.filter(row => row.date >= df);
    if (dt) r = r.filter(row => row.date <= dt);
    return r;
  }, [rows, fc, df, dt]);

  const currencies = useMemo(() => [...new Set((rows || []).map(r => r.currency))].filter(Boolean), [rows]);
  const totals = useMemo(() => ({ debit: filtered.reduce((s, r) => s + r.debit, 0), credit: filtered.reduce((s, r) => s + r.credit, 0) }), [filtered]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'التاريخ': r.date, 'البيان': r.desc, 'المرجع': r.ref,
      'مدين': r.debit || '', 'دائن': r.credit || '', 'الرصيد': r.balance, 'العملة': r.currency,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'كشف حساب');
    XLSX.writeFile(wb, `statement_${partyName}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.text(`كشف حساب - ${partyName}`, 14, 20);
    doc.setFontSize(10);
    (doc as any).autoTable = (await import('jspdf-autotable')).default;
    (doc as any).autoTable({
      startY: 30,
      head: [['التاريخ', 'البيان', 'مدين', 'دائن', 'الرصيد', 'العملة']],
      body: filtered.map(r => [r.date, r.desc, r.debit || '', r.credit || '', r.balance, r.currency]),
      styles: { font: 'helvetica', fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`statement_${partyName}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  if (isLoading) return <div className="text-center py-8 text-[var(--app-text-secondary)]">{t('loading')}</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border">
        <Filter className="w-4 h-4 text-[var(--app-text-secondary)]"/>
        <select value={fc} onChange={e => setFc(e.target.value)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs">
          <option value="">{t('all_currencies') || 'كل العملات'}</option>
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={df} onChange={e => setDf(e.target.value)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"/>
        <span className="text-xs text-[var(--app-text-secondary)]">-</span>
        <input type="date" value={dt} onChange={e => setDt(e.target.value)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"/>
        <button onClick={exportPdf} className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">
          <Download className="w-3 h-3"/> PDF
        </button>
        <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
          <Download className="w-3 h-3"/> Excel
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-[var(--app-text-secondary)]">
            <tr>
              <th className="p-2 text-right">{t('date')}</th>
              <th className="p-2 text-right">{t('description') || 'البيان'}</th>
              <th className="p-2 text-right">{t('reference') || 'المرجع'}</th>
              <th className="p-2 text-right">{t('debit') || 'مدين'}</th>
              <th className="p-2 text-right">{t('credit') || 'دائن'}</th>
              <th className="p-2 text-right">{t('balance') || 'الرصيد'}</th>
              <th className="p-2 text-center">{t('currency')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-[var(--app-text-secondary)]"><FileText className="w-8 h-8 mx-auto mb-1 opacity-30"/>{t('no_data') || 'لا توجد بيانات'}</td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 text-[var(--app-text)]">
                <td className="p-2 whitespace-nowrap">{r.date}</td>
                <td className="p-2 max-w-[200px] truncate">{r.desc}</td>
                <td className="p-2">{r.ref}</td>
                <td className="p-2 text-red-600 font-medium">{r.debit > 0 ? new Intl.NumberFormat('ar-SA').format(r.debit) : ''}</td>
                <td className="p-2 text-green-600 font-medium">{r.credit > 0 ? new Intl.NumberFormat('ar-SA').format(r.credit) : ''}</td>
                <td className="p-2 font-bold">{new Intl.NumberFormat('ar-SA').format(r.balance)}</td>
                <td className="p-2 text-center">{r.currency}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-bold text-xs">
            <tr>
              <td className="p-2" colSpan={3}>{t('total')}</td>
              <td className="p-2 text-red-600">{new Intl.NumberFormat('ar-SA').format(totals.debit)}</td>
              <td className="p-2 text-green-600">{new Intl.NumberFormat('ar-SA').format(totals.credit)}</td>
              <td className="p-2">{new Intl.NumberFormat('ar-SA').format(totals.debit - totals.credit)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default StatementTable;

        <select value={fc} onChange={e => setFc(e.target.value)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs">
          <option value="">{t('all_currencies') || 'كل العملات'}</option>
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={df} onChange={e => setDf(e.target.value)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"/>
        <span className="text-xs text-[var(--app-text-secondary)]">-</span>
        <input type="date" value={dt} onChange={e => setDt(e.target.value)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs"/>
        <button onClick={exportExcel} className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
          <Download className="w-3 h-3"/> Excel
        </button>
      </div>
