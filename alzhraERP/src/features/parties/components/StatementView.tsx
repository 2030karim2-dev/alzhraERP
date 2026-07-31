
import React, { useState } from 'react';
import { useParties, useStatement } from '../hooks';
import ExcelTable from '../../../ui/common/ExcelTable';
import { formatCurrency, cn } from '../../../core/utils';
import { tafqeet } from '../../../core/utils/tafqeet';
import { Printer, TrendingUp, TrendingDown, Wallet, Share2 } from 'lucide-react';
import { PartyType } from '../types';
import Button from '../../../ui/base/Button';
import ShareButton from '../../../ui/common/ShareButton';
import { exportStatementToExcel } from '../utils/statementExcelExporter';
import { partiesService, StatementMovement } from '../service';
import { useAuthStore } from '../../auth/store';
import { FileDown } from 'lucide-react';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';

const StatementView: React.FC<{ partyType: PartyType }> = ({ partyType }) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const { data: parties } = useParties(partyType);
  const { data: statement, isLoading } = useStatement(selectedPartyId, partyType);
  const [isExporting, setIsExporting] = useState(false);
  const user = useAuthStore(state => state.user);
  
  const { data: settingsCompany } = useCompany();
  const invoiceSettings = useInvoiceSettings();

  const selectedParty = parties?.find(p => p.id === selectedPartyId);

  const columns = [
    {
      header: 'التاريخ',
      accessor: (row: StatementMovement) => <span dir="ltr" className="text-xs">{row.date}</span>,
      width: '110px',
      align: 'center' as const
    },
    {
      header: 'المرجع',
      accessor: (row: StatementMovement) => <span dir="ltr" className="font-mono font-bold text-blue-600">{row.ref}</span>,
      width: '110px',
      align: 'center' as const
    },
    {
      header: 'نوع العملية',
      accessor: (row: StatementMovement) => <span className="font-bold text-gray-700 dark:text-slate-300">{row.operation_type}</span>,
      width: '120px',
      align: 'center' as const
    },
    {
      header: 'البيان',
      accessor: (row: StatementMovement) => <span className="text-xs text-gray-500 line-clamp-1" title={row.desc}>{row.desc}</span>,
      align: 'right' as const
    },
    {
      header: 'مدين',
      accessor: (row: StatementMovement) => (row.debit) > 0 ? <span dir="ltr" className="font-bold text-emerald-600">{formatCurrency(row.debit)}</span> : '-',
      width: '130px',
      align: 'center' as const
    },
    {
      header: 'دائن',
      accessor: (row: StatementMovement) => (row.credit) > 0 ? <span dir="ltr" className="font-bold text-rose-600">{formatCurrency(row.credit)}</span> : '-',
      width: '130px',
      align: 'center' as const
    },
    {
      header: 'الرصيد المتراكم',
      accessor: (row: StatementMovement) => (
        <span dir="ltr" className={cn("font-bold font-mono", (row.balance || 0) >= 0 ? "text-emerald-700" : "text-rose-700")}>
          {formatCurrency(row.balance || 0)}
        </span>
      ),
      width: '150px',
      align: 'center' as const
    },
  ];

  const company = {
      nameAr: invoiceSettings?.company_name_ar || settingsCompany?.name || 'اسم الشركة',
      nameEn: invoiceSettings?.company_name_en || settingsCompany?.english_name || 'Company Name',
      address: invoiceSettings?.company_address || settingsCompany?.address || '',
      phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
      taxNumber: settingsCompany?.tax_number || '---',
      specialization: invoiceSettings?.company_specialization || '',
      headerText: invoiceSettings?.invoice_header_text || ''
  };

  return (
    <div className="space-y-3 print-area font-sans">
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
      
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 flex gap-4 items-center no-print">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500">اختر {partyType === 'customer' ? 'العميل' : 'المورد'}</label>
          <select
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            className="w-full mt-1 bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-2 px-3 text-sm font-bold"
          >
            <option value="">-- اختر من القائمة --</option>
            {parties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {selectedPartyId && selectedParty && (
          <div className="flex gap-2 mt-auto">
            <Button
              variant="outline"
              onClick={async () => {
                if (!selectedPartyId || !statement || !user?.company_id) return;
                setIsExporting(true);
                try {
                  const companyDetails = await partiesService.getCompanyDetails(user.company_id);
                  const company = {
                    ...companyDetails,
                    address: companyDetails.address || '',
                    phone: companyDetails.phone || '',
                    tax_number: companyDetails.tax_number || '',
                    logo_url: companyDetails.logo_url || ''
                  } as any;
                  
                  const blob = await import('../utils/statementExcelExporter').then(m => 
                    m.generateStatementExcelBlob(company, selectedParty.name, statement as any)
                  );
                  
                  const file = new File([blob], `كشف_حساب_${selectedParty.name.replace(/\s+/g, '_')}.xlsx`, {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  });

                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                      files: [file],
                      title: `كشف حساب ${selectedParty.name}`,
                      text: `مرفق كشف حساب ${selectedParty.name}`
                    });
                  } else {
                    // Fallback to downloading if native share isn't supported (e.g. desktop Chrome)
                    const { exportStatementToExcel } = await import('../utils/statementExcelExporter');
                    exportStatementToExcel(company, selectedParty.name, statement as any);
                    
                    // Open wa.me link with a message
                    const text = encodeURIComponent(`مرفق كشف حساب ${selectedParty.name}. يرجى الاطلاع على الملف المرفق.`);
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }
                } catch (err) {
                  console.error('Share failed', err);
                } finally {
                  setIsExporting(false);
                }
              }}
              className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-emerald-200"
              disabled={isExporting}
            >
              <Share2 size={16} />
              مشاركة (ملف إكسل)
            </Button>
            <Button
              onClick={async () => {
                if (!selectedPartyId || !statement || !user?.company_id) return;
                setIsExporting(true);
                try {
                  const companyDetails = await partiesService.getCompanyDetails(user.company_id);
                  exportStatementToExcel({
                    ...companyDetails,
                    address: companyDetails.address || '',
                    phone: companyDetails.phone || '',
                    tax_number: companyDetails.tax_number || '',
                    logo_url: companyDetails.logo_url || ''
                  } as any, selectedParty.name, statement as any);
                } catch (err) {
                  console.error('Export failed', err);
                } finally {
                  setIsExporting(false);
                }
              }}
              isLoading={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              leftIcon={<FileDown size={14} />}
            >
              تصدير Excel
            </Button>
            <Button onClick={() => window.print()} className="" leftIcon={<Printer size={14} />}>
              طباعة الكشف
            </Button>
          </div>
        )}
      </div>

      {
        selectedPartyId ? (
          isLoading ? <div className="p-20 text-center">جاري تحميل الكشف...</div> :
            <>
              {/* Professional Print Header */}
              <div className="print-only mb-6 border-b-2 border-[#1F4E78] pb-4">
                  <div className="flex justify-between items-center mb-4">
                      <div className="text-right flex-1">
                          <h1 className="text-xl font-bold text-[#1F4E78]">{company.nameAr}</h1>
                          {company.specialization && <p className="text-sm font-bold text-blue-800">{company.specialization}</p>}
                          <p className="text-sm mt-1">{company.address}</p>
                          <div className="flex flex-col gap-1 mt-1 text-xs font-bold text-gray-700">
                              {company.phone && <span>هاتف: {company.phone}</span>}
                              {company.taxNumber && <span>الرقم الضريبي: {company.taxNumber}</span>}
                          </div>
                      </div>
                      <div className="flex-1 text-center">
                          {company.headerText && <p className="text-sm font-bold text-gray-500">{company.headerText}</p>}
                          <h2 className="text-xl font-bold text-gray-800 mt-2 bg-gray-100 inline-block px-4 py-1 rounded">كشف حساب</h2>
                      </div>
                      <div className="text-left flex-1" dir="ltr">
                          <h1 className="text-xl font-bold text-[#1F4E78]">{company.nameEn}</h1>
                          <h2 className="text-md font-bold mt-2 text-gray-800">Statement of Account</h2>
                      </div>
                  </div>
                  <div className="border border-[#1F4E78] bg-[#FAFAFA] p-3 rounded flex justify-between">
                      <div className="text-sm">
                          <strong>اسم {partyType === 'customer' ? 'العميل' : 'المورد'}:</strong> {selectedParty?.name}
                      </div>
                      <div className="text-sm">
                          <strong>تاريخ الاستخراج:</strong> <span dir="ltr">{new Date().toLocaleDateString('en-GB')}</span>
                      </div>
                  </div>
              </div>

              <ExcelTable columns={columns} data={statement || []} title={`كشف حساب: ${selectedParty?.name}`} colorTheme={partyType === 'customer' ? 'green' : 'blue'} />

              {statement && statement.length > 0 && (
                <div className="mt-6 p-6 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl shadow-xl shadow-blue-500/5 overflow-hidden relative group">
                  {/* Background Accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/10 transition-colors no-print" />

                  <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* Status Indicator */}
                    {(() => {
                      const lastEntry = statement[statement.length - 1];
                      const finalBalance = lastEntry.balance || 0;
                      const isDebit = finalBalance > 0;
                      const isCredit = finalBalance < 0;
                      const absBalance = Math.abs(finalBalance);

                      return (
                        <>
                          <div className="md:col-span-1 space-y-4">
                            <div className="space-y-1">
                              <h3 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Wallet size={14} />
                                الخلاصة المالية
                              </h3>
                              <p className="text-xs font-bold text-gray-400">الوضعية الحالية للحساب حتى تاريخ اليوم</p>
                            </div>

                            <div className={cn(
                              "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-tighter shadow-sm border",
                              isDebit ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                isCredit ? "bg-rose-50 text-rose-700 border-rose-100" :
                                  "bg-gray-50 text-gray-600 border-gray-100"
                            )}>
                              {isDebit ? <TrendingUp size={14} className="no-print" /> : isCredit ? <TrendingDown size={14} className="no-print" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current no-print" />}
                              {isDebit ? "رصيد مدين (له)" : isCredit ? "رصيد دائن (عليه)" : "الرصيد مصفر"}
                            </div>
                          </div>

                          <div className="md:col-span-1 bg-gray-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-inner">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">صافي الرصيد</span>
                            <span dir="ltr" className={cn("text-3xl font-bold font-mono tracking-tighter", isDebit ? "text-emerald-600" : isCredit ? "text-rose-600" : "text-gray-800")}>
                              {formatCurrency(finalBalance)}
                            </span>
                          </div>

                          <div className="md:col-span-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 no-print" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">التفقيط (كتابةً)</span>
                            </div>
                            <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                                {finalBalance === 0 ? 'الرصيد مصفر حالياً' : `فقط ${tafqeet(absBalance)} لا غير.`}
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
        ) : (
          <div className="p-20 text-center text-gray-400 border-2 border-dashed rounded-lg bg-gray-50/50 no-print">
            يرجى اختيار جهة لعرض كشف الحساب
          </div>
        )
      }
    </div >
  );
};

export default StatementView;
