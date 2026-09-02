import React from 'react';
import type { PartyType } from '../../types';

interface CompanyInfo {
  nameAr: string;
  nameEn: string;
  address: string;
  phone: string;
  taxNumber: string;
  specialization: string;
  headerText: string;
}

interface StatementPrintSheetProps {
  company: CompanyInfo;
  partyType: PartyType;
  partyName?: string;
}

export const StatementPrintSheet: React.FC<StatementPrintSheetProps> = ({
  company,
  partyType,
  partyName,
}) => {
  return (
    <>
      <style>{`
        @media print {
            body { background-color: white !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            @page { margin: 10mm; size: A4 portrait; }
            .print-area {
                font-family: 'Arial', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                color: #000 !important;
                font-variant-numeric: tabular-nums;
            }
            /* Make ExcelTable look like a real printed Excel grid */
            table {
                border-collapse: collapse !important;
                width: 100% !important;
            }
            th, td {
                border: 1px solid #000 !important;
                padding: 6px !important;
                color: #000 !important;
            }
            th {
                background-color: #1F4E78 !important;
                color: #fff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            /* Hide the toolbar of ExcelTable in print */
            .table-toolbar { display: none !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Professional Header - Visible on screen and print */}
      <div className="screen:max-md:mb-3 screen:max-md:pb-2 screen:max-md:p-3 mb-5 rounded-xl border-b-2 border-[#1F4E78] bg-[var(--app-surface)] p-5 pb-4 shadow-sm dark:border-blue-700">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1 text-right">
            <h1 className="text-xl font-bold text-[#1F4E78] dark:text-blue-400">
              {company.nameAr}
            </h1>
            {company.specialization && (
              <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                {company.specialization}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{company.address}</p>
            <div className="mt-1 flex flex-col gap-1 text-xs font-bold text-slate-600 dark:text-slate-400">
              {company.phone && <span>هاتف: {company.phone}</span>}
              {company.taxNumber && <span>الرقم الضريبي: {company.taxNumber}</span>}
            </div>
          </div>
          <div className="flex-1 text-center">
            {company.headerText && (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {company.headerText}
              </p>
            )}
            <h2 className="screen:max-md:text-base mt-2 inline-block rounded-lg bg-slate-100 px-4 py-1 text-xl font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              كشف حساب
            </h2>
          </div>
          <div className="flex-1 text-left" dir="ltr">
            <h1 className="text-xl font-bold text-[#1F4E78] dark:text-blue-400">
              {company.nameEn}
            </h1>
            <h2 className="text-md mt-2 font-bold text-slate-800 dark:text-slate-300">
              Statement of Account
            </h2>
          </div>
        </div>
        <div className="flex justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="text-sm text-slate-800 dark:text-slate-200">
            <strong>اسم {partyType === 'customer' ? 'العميل' : 'المورد'}:</strong>{' '}
            {partyName || '—'}
          </div>
          <div className="text-sm text-slate-800 dark:text-slate-200">
            <strong>تاريخ الاستخراج:</strong>{' '}
            <span dir="ltr">{new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>
    </>
  );
};
