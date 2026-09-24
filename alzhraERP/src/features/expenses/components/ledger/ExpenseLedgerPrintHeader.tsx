/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';

interface ExpenseLedgerPrintHeaderProps {
  selectedAccount?:
    | {
        name: string;
        code: string;
        currency_code?: string | null | undefined;
      }
    | null
    | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export const ExpenseLedgerPrintHeader: React.FC<ExpenseLedgerPrintHeaderProps> = ({
  selectedAccount,
  dateFrom,
  dateTo,
}) => {
  return (
    <div className="mb-4 hidden border-b pb-4 text-center print:block">
      <h2 className="text-xl font-bold">كشف حساب تفصيلي - سجل الأستاذ العام</h2>
      {selectedAccount && (
        <p className="text-sm font-bold text-gray-700">
          الحساب: {selectedAccount.name} ({selectedAccount.code}) | العملة:{' '}
          {selectedAccount.currency_code || 'SAR'}
        </p>
      )}
      <p className="text-xs text-gray-500">
        الفترة: {dateFrom || 'البداية'} إلى {dateTo || 'الآن'} | تاريخ الطباعة:{' '}
        {new Date().toLocaleDateString('ar-SA')}
      </p>
    </div>
  );
};
