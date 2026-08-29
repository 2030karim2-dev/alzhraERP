import React, { useState } from 'react';
import { Party, PartyType } from '../../types';
import { StatementMovement, partiesService } from '../../service';
import Button from '../../../../ui/base/Button';
import { Share2, FileDown, Printer } from 'lucide-react';
import { logger } from '../../../../core/utils/logger';
import { useAuthStore } from '../../../auth/store';
import { useCompany } from '../../../settings/hooks';

interface StatementControlsProps {
  partyType: PartyType;
  parties?: Party[];
  selectedPartyId: string;
  onSelectPartyId: (id: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  statement?: StatementMovement[];
  companyNameAr: string;
}

export const StatementControls: React.FC<StatementControlsProps> = ({
  partyType,
  parties,
  selectedPartyId,
  onSelectPartyId,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  statement,
  companyNameAr,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { data: settingsCompany } = useCompany();

  const selectedParty = parties?.find((p) => p.id === selectedPartyId);
  const filteredStatement = statement || [];

  // تحويل StatementMovement[] → StatementEntry[] (يضمن balance إلزامياً) لتمريره للمصدِّرات.
  const statementEntries = filteredStatement.map((r) => ({
    date: r.date,
    operation_type: r.operation_type ?? '',
    reference_no: r.ref,
    desc: r.desc,
    debit: Number(r.debit) || 0,
    credit: Number(r.credit) || 0,
    balance: Number(r.balance) || 0,
  }));

  const handleWhatsAppShare = async () => {
    if (!selectedPartyId || !statement || !user?.company_id || !selectedParty) return;
    const totalDebit = filteredStatement.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const totalCredit = filteredStatement.reduce((s, r) => s + (Number(r.credit) || 0), 0);
    const finalBal =
      filteredStatement.length > 0
        ? Number(filteredStatement[filteredStatement.length - 1].balance) || 0
        : 0;

    const { debtAiService } = await import('../../../debts/services/debtAiService');
    const { buildWhatsAppLink } = await import('../../../debts/lib/whatsapp');

    const summaryText = debtAiService.generateWhatsAppStatementSummary({
      partyName: selectedParty.name,
      totalDebit,
      totalCredit,
      finalBalance: finalBal,
      currency: filteredStatement[0]?.currency || 'SAR',
      companyName: companyNameAr,
      ...(startDate && endDate ? { dateRangeText: `من ${startDate} إلى ${endDate}` } : {}),
      ...((settingsCompany as { bank_name?: string } | null | undefined)?.bank_name
        ? {
            bankInfo: `البنك: ${(settingsCompany as { bank_name?: string }).bank_name} | الآيبان: ${
              (settingsCompany as { bank_account_iban?: string })?.bank_account_iban || '—'
            }`,
          }
        : {}),
    });

    if (selectedParty.phone) {
      const link = buildWhatsAppLink(selectedParty.phone, summaryText);
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigator.clipboard.writeText(summaryText);
      alert('تم نسخ ملخص كشف الحساب إلى الحافظة (لا يوجد رقم هاتف مسجل للعميل).');
    }
  };

  const handleShareExcel = async () => {
    if (!selectedPartyId || !statement || !user?.company_id || !selectedParty) return;
    setIsExporting(true);
    try {
      const companyDetails = await partiesService.getCompanyDetails(user.company_id);
      const companyObj = {
        ...companyDetails,
        address: companyDetails.address || '',
        phone: companyDetails.phone || '',
        tax_number: companyDetails.tax_number || '',
        logo_url: companyDetails.logo_url || '',
      };

      const { generateStatementExcelBlob } = await import('../../utils/statementExcelExporter');
      const blob = await generateStatementExcelBlob(
        companyObj,
        selectedParty.name,
        statementEntries,
        {
          currencyCode: filteredStatement[0]?.currency || 'SAR',
          ...(selectedParty.phone ? { partyPhone: selectedParty.phone } : {}),
          dateFrom: startDate,
          dateTo: endDate,
        }
      );

      const file = new File([blob], `كشف_حساب_${selectedParty.name.replace(/\s+/g, '_')}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `كشف حساب ${selectedParty.name}`,
          text: `مرفق كشف حساب ${selectedParty.name}`,
        });
      } else {
        const { exportStatementToExcel } = await import('../../utils/statementExcelExporter');
        await exportStatementToExcel(companyObj, selectedParty.name, statementEntries, {
          currencyCode: filteredStatement[0]?.currency || 'SAR',
          ...(selectedParty.phone ? { partyPhone: selectedParty.phone } : {}),
          dateFrom: startDate,
          dateTo: endDate,
        });
      }
    } catch (err) {
      logger.error('StatementView', 'Share failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedPartyId || !statement || !user?.company_id || !selectedParty) return;
    setIsExporting(true);
    try {
      const companyDetails = await partiesService.getCompanyDetails(user.company_id);
      const { exportStatementToExcel } = await import('../../utils/statementExcelExporter');
      await exportStatementToExcel(
        {
          ...companyDetails,
          address: companyDetails.address || '',
          phone: companyDetails.phone || '',
          tax_number: companyDetails.tax_number || '',
          logo_url: companyDetails.logo_url || '',
        },
        selectedParty.name,
        statementEntries,
        {
          currencyCode: filteredStatement[0]?.currency || 'SAR',
          ...(selectedParty.phone ? { partyPhone: selectedParty.phone } : {}),
          dateFrom: startDate,
          dateTo: endDate,
        }
      );
    } catch (err) {
      logger.error('StatementView', 'Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[var(--app-surface)] p-4 max-md:p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 max-md:gap-2.5 items-end no-print shadow-sm">
      <div className="flex-1 min-w-[200px] max-md:w-full">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
          اختر {partyType === 'customer' ? 'العميل' : 'المورد'}
        </label>
        <select
          value={selectedPartyId}
          onChange={(e) => onSelectPartyId(e.target.value)}
          className="w-full mt-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        >
          <option value="">-- اختر من القائمة --</option>
          {parties?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-36 max-md:flex-1">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">من تاريخ</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full mt-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>
      <div className="w-36 max-md:flex-1">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">إلى تاريخ</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full mt-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>
      {selectedPartyId && selectedParty && (
        <div className="flex flex-wrap gap-2 mt-auto max-md:w-full max-md:grid max-md:grid-cols-2">
          <Button
            variant="outline"
            onClick={handleWhatsAppShare}
            className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 rounded-lg font-bold"
          >
            <Share2 size={15} />
            واتساب
          </Button>
          <Button
            variant="outline"
            onClick={handleShareExcel}
            className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 rounded-lg font-bold"
            disabled={isExporting}
          >
            <FileDown size={15} />
            مشاركة
          </Button>
          <Button
            onClick={handleExportExcel}
            isLoading={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
            leftIcon={<FileDown size={15} />}
          >
            تصدير Excel
          </Button>
          <Button
            onClick={() => window.print()}
            leftIcon={<Printer size={15} />}
            className="rounded-lg font-bold shadow-sm"
          >
            طباعة
          </Button>
        </div>
      )}
    </div>
  );
};
