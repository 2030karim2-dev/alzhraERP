import React, { useState } from 'react';
import { MessageSquare, Copy, CheckCircle2 } from 'lucide-react';
import { SmartReminder } from '../../hooks/useDebtManagement';

interface Props {
  reminders: SmartReminder[];
}

export const SmartRemindersPanel: React.FC<Props> = ({ reminders }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!reminders || reminders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
            <MessageSquare className="w-6 h-6 text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">لا توجد رسائل مقترحة حالياً</h3>
        <p className="text-gray-500 mt-1">يقوم المساعد الذكي بتوليد رسائل ودية لتذكير العملاء بالدفع عند اقتراب أو تجاوز مواعيد الاستحقاق.</p>
      </div>
    );
  }

  const getTypeStyle = (type: SmartReminder['type']) => {
      switch(type) {
          case 'before_due': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
          case 'on_due': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'after_due': return 'bg-orange-100 text-orange-800 border-orange-200';
          case 'long_overdue': return 'bg-red-100 text-red-800 border-red-200';
          case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
          default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
  };

  const getTypeName = (type: SmartReminder['type']) => {
      switch(type) {
          case 'before_due': return 'قبل الاستحقاق';
          case 'on_due': return 'يوم الاستحقاق';
          case 'after_due': return 'بعد الاستحقاق';
          case 'long_overdue': return 'تأخير طويل';
          case 'inactive': return 'عميل غير نشط';
          default: return type;
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-100 h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">رسائل التذكير الذكية</h3>
         </div>
         <span className="text-xs text-gray-500 border bg-white px-2 py-1 rounded-md">
             {reminders.length} رسالة مقترحة
         </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-4 bg-gray-50/30">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="bg-white border text-right border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div>
                   <span className="font-bold text-gray-900">{reminder.customerName}</span>
                   {reminder.invoiceNumber && (
                        <span className="text-sm text-gray-500 mr-2">
                            (فاتورة {reminder.invoiceNumber})
                        </span>
                   )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getTypeStyle(reminder.type)}`}>
                    {getTypeName(reminder.type)}
                </span>
            </div>
            
            <div className="bg-gray-50 rounded-md p-3 border border-gray-100 mb-3 relative group">
                <p className="text-sm text-gray-800 leading-relaxed font-sans">
                    "{reminder.message}"
                </p>
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleCopy(reminder.id, reminder.message)}
                        className="bg-white border shadow-sm p-1.5 rounded-md hover:bg-blue-50 text-gray-600 hover:text-blue-600 focus:outline-none"
                        title="نسخ النص"
                    >
                        {copiedId === reminder.id ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
            
            <div className="flex justify-end">
                <button
                    onClick={() => handleCopy(reminder.id, reminder.message)}
                    className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800"
                >
                    {copiedId === reminder.id ? 'تم النسخ بنجاح' : 'نسخ النص'}
                    {copiedId === reminder.id ? <CheckCircle2 className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
