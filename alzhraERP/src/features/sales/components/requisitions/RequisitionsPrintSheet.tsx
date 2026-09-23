/* eslint-disable max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-type-conversion */
import React from 'react';
import type { RequisitionItem, RequisitionSupplier } from '../../types/requisitions';
import { useDocumentHeaderSettings } from '@/features/settings/settingsStore';
import { UniversalDocumentHeader } from '@/ui/common/UniversalDocumentHeader';
import { formatLocalDate } from '@/core/utils/dateUtils';

interface RequisitionsPrintSheetProps {
  company: {
    name?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    tax_number?: string | undefined;
    commercial_register?: string | undefined;
    slogan?: string | undefined;
    logo_url?: string | undefined;
  };
  supplier?: RequisitionSupplier | null | undefined;
  items: RequisitionItem[];
  notes?: string | undefined;
  batchTitle?: string | undefined;
}

export const RequisitionsPrintSheet: React.FC<RequisitionsPrintSheetProps> = ({
  company,
  supplier,
  items,
  notes,
  batchTitle,
}) => {
  const headerConfig = useDocumentHeaderSettings();
  const currentDate = formatLocalDate();

  const validItems = items.filter(item => item.name.trim() !== '' || item.partNumber.trim() !== '');
  const displayItems = validItems.length > 0 ? validItems : items;

  let totalQuantity = 0;
  displayItems.forEach(item => {
    totalQuantity += Number(item.quantity) || 1;
  });

  return (
    <div className="requisitions-print-wrapper bg-white p-6 text-slate-900" dir="rtl">
      <style>{`
        @media print {
          body { background-color: white !important; }
          .no-print { display: none !important; }
          @page { margin: 10mm; size: A4 portrait; }
          .requisitions-print-wrapper {
            padding: 0 !important;
            font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif !important;
            color: #000 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #1e293b !important;
            padding: 6px 8px !important;
            color: #000 !important;
            font-size: 11px !important;
          }
          th {
            background-color: #1F4E78 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }

        /* Screen preview styling for PDF capture */
        .requisition-grid-table {
          width: 100%;
          border-collapse: collapse;
        }
        .requisition-grid-table th {
          border: 1px solid #0f172a;
          background-color: #1F4E78;
          color: #ffffff;
          padding: 7px 8px;
          font-size: 11px;
          font-weight: bold;
          text-align: right;
        }
        .requisition-grid-table td {
          border: 1px solid #334155;
          padding: 6px 8px;
          font-size: 11px;
          color: #0f172a;
        }
        .requisition-grid-table tr:nth-child(even) td {
          background-color: #f8fafc;
        }
      `}</style>

      {/* Professional Header */}
      <div className="mb-4 rounded-lg border-b-2 border-[#1F4E78] pb-3">
        <UniversalDocumentHeader
          config={headerConfig}
          company={{
            name: company.name,
            phone: company.phone,
            address: company.address,
            tax_number: company.tax_number,
            commercial_register: company.commercial_register,
            slogan: company.slogan,
            logo_url: company.logo_url,
          }}
          documentTitle={batchTitle || 'قائمة طلبات الشراء والمطلوبات'}
          documentDate={currentDate}
        />
      </div>

      {/* Supplier & Order Meta Bar */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded border border-slate-300 bg-slate-50 p-2.5 text-xs sm:grid-cols-4">
        <div>
          <span className="font-bold text-slate-500">المورد المستهدف: </span>
          <span className="font-bold text-slate-900">{supplier?.name || 'عام / غير محدد'}</span>
        </div>
        <div>
          <span className="font-bold text-slate-500">رقم الهاتف: </span>
          <span className="font-mono text-slate-900" dir="ltr">
            {supplier?.phone || '---'}
          </span>
        </div>
        <div>
          <span className="font-bold text-slate-500">تاريخ الطلب: </span>
          <span className="text-slate-900">{currentDate}</span>
        </div>
        <div>
          <span className="font-bold text-slate-500">عدد الأصناف: </span>
          <span className="font-bold text-blue-700">{displayItems.length} صنف</span>
        </div>
      </div>

      {/* Excel-like Grid Table with Visible Lines */}
      <div className="mb-4 overflow-hidden rounded border border-slate-400">
        <table className="requisition-grid-table">
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>#</th>
              <th style={{ width: '40%' }}>اسم القطعة المطلوبة</th>
              <th style={{ width: '22%' }}>رقم القطعة (Part No.)</th>
              <th style={{ width: '18%' }}>الشركة الصانعة</th>
              <th style={{ width: '8%', textAlign: 'center' }}>الكمية</th>
              <th style={{ width: '17%' }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item, index) => (
              <tr key={item.id || index}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                <td style={{ fontWeight: '600' }}>{item.name || '---'}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold', direction: 'ltr' }}>
                  {item.partNumber || '---'}
                </td>
                <td>{item.brand || '---'}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                  {item.quantity || 1}
                </td>
                <td style={{ fontSize: '10px', color: '#475569' }}>{item.notes || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
              <td colSpan={4} style={{ textAlign: 'left', padding: '8px 12px' }}>
                إجمالي كميات القطع المطلوبة:
              </td>
              <td
                style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#1e3a8a',
                }}
              >
                {totalQuantity}
              </td>
              <td style={{ fontSize: '10px' }}>عدد البنود: {displayItems.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes & Footer instructions */}
      {notes?.trim() && (
        <div className="mb-4 rounded border border-slate-300 bg-amber-50/50 p-2.5 text-xs text-slate-800">
          <span className="font-bold text-amber-900">ملاحظات إضافية: </span>
          <span>{notes}</span>
        </div>
      )}

      {/* Signature & Confirmation Block */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-300 pt-4 text-xs text-slate-500">
        <div>
          <span>المسؤول عن الطلب: .................................</span>
        </div>
        <div>
          <span>توقيع / ختم المستلم: .................................</span>
        </div>
        <div>
          <span>التاريخ: {currentDate}</span>
        </div>
      </div>
    </div>
  );
};
