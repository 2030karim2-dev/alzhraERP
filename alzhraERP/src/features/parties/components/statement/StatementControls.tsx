import React, { useState } from 'react';
import type { Party, PartyType } from '../../types';
import { type StatementMovement, partiesService } from '../../service';
import Button from '../../../../ui/base/Button';
import { Share2, FileDown, Printer } from 'lucide-react';
import { logger } from '../../../../core/utils/logger';
import { useAuthStore } from '../../../auth/store';
import { useCompany } from '../../../settings/hooks';
import { SmartPartySelect } from '../SmartPartySelect';

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
  const user = useAuthStore(state => state.user);
  const { data: settingsCompany } = useCompany();

  const selectedParty = parties?.find(p => p.id === selectedPartyId);
  const filteredStatement = statement || [];

  // تحويل StatementMovement[] → StatementEntry[] (يضمن balance إلزامياً) لتمريره للمصدِّرات.
  const statementEntries = filteredStatement.map(r => ({
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
    <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800 max-md:gap-2.5 max-md:p-3">
      <div className="min-w-[240px] flex-1 max-md:w-full">
        <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
          اختر {partyType === 'customer' ? 'العميل' : 'المورد'} (بحث ذكي بالاسم أو الهاتف)
        </label>
        <SmartPartySelect
          partyType={partyType}
          selectedPartyId={selectedPartyId}
          onSelectPartyId={onSelectPartyId}
          {...(parties ? { parties } : {})}
        />
      </div>
      <div className="w-36 max-md:flex-1">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">من تاريخ</label>
        <input
          type="date"
          value={startDate}
          onChange={e => {
            onStartDateChange(e.target.value);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
        />
      </div>
      <div className="w-36 max-md:flex-1">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">إلى تاريخ</label>
        <input
          type="date"
          value={endDate}
          onChange={e => {
            onEndDateChange(e.target.value);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
        />
      </div>
      {selectedPartyId && selectedParty && (
        <div className="mt-auto flex flex-wrap gap-2 max-md:grid max-md:w-full max-md:grid-cols-2">
          <Button
            variant="outline"
            onClick={handleWhatsAppShare}
            className="gap-2 rounded-lg border-emerald-200 font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800/60 dark:hover:bg-emerald-950/30"
          >
            <Share2 size={15} />
            واتساب
          </Button>
          <Button
            variant="outline"
            onClick={handleShareExcel}
            className="gap-2 rounded-lg border-blue-200 font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800/60 dark:hover:bg-blue-950/30"
            disabled={isExporting}
          >
            <FileDown size={15} />
            مشاركة
          </Button>
          <Button
            onClick={handleExportExcel}
            isLoading={isExporting}
            className="rounded-lg bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700"
            leftIcon={<FileDown size={15} />}
          >
            تصدير Excel
          </Button>
          <Button
            onClick={() => {
              window.print();
            }}
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
