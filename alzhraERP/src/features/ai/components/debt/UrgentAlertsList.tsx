import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { DebtAlert } from '../../hooks/useDebtManagement';

interface Props {
  alerts: DebtAlert[];
}

export const UrgentAlertsList: React.FC<Props> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
            <span className="text-xl">✅</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900">لا توجد تنبيهات عاجلة</h3>
        <p className="text-gray-500 mt-1">حالة الديون مستقرة ولا توجد مدفوعات متأخرة خطيرة حالياً.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-orange-50/50 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-bold text-gray-900">تنبيهات المساعد الذكي</h3>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
          {alerts.length} تنبيه
        </span>
      </div>
      <div className="p-0 divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3">
            <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${
                alert.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
            }`}>
               {alert.type === 'overdue' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 leading-snug">{alert.message}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span className={`px-2 py-0.5 rounded-full border ${
                      alert.severity === 'high' ? 'border-red-200 text-red-600' : 'border-orange-200 text-orange-600'
                  }`}>
                    {alert.severity === 'high' ? 'عالي الأهمية' : 'متوسط الأهمية'}
                  </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
