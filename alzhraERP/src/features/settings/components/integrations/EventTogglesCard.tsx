// ============================================
// EventTogglesCard — بطاقة اختيار الأحداث التي تُرسل إشعاراً
// ============================================
import React from 'react';
import { Radio } from 'lucide-react';
import Card from '@/ui/base/Card';
import type { MessagingConfig } from '@/features/notifications/messagingApi';

interface EventToggle {
  id: keyof MessagingConfig;
  label: string;
  desc: string;
  emoji: string;
}

const EVENT_TOGGLES: EventToggle[] = [
  { id: 'notify_on_sale', label: 'المبيعات', desc: 'إشعار عند إنشاء فاتورة بيع', emoji: '🧾' },
  {
    id: 'notify_on_purchase',
    label: 'المشتريات',
    desc: 'إشعار عند إنشاء فاتورة شراء',
    emoji: '📦',
  },
  { id: 'notify_on_bond', label: 'السندات', desc: 'إشعار عند إنشاء سند قبض أو صرف', emoji: '💵' },
  { id: 'notify_on_expense', label: 'المصروفات', desc: 'إشعار عند تسجيل مصروف', emoji: '🏷️' },
  {
    id: 'notify_on_stock_transfer',
    label: 'تحويلات المخزون',
    desc: 'إشعار عند تحويل بين المستودعات',
    emoji: '🔄',
  },
  {
    id: 'notify_on_low_stock',
    label: 'تنبيه المخزون',
    desc: 'إشعار عند وصول صنف للحد الأدنى',
    emoji: '⚠️',
  },
];

interface Props {
  config: MessagingConfig;
  onUpdate: (updates: Partial<MessagingConfig>) => void;
}

const EventTogglesCard: React.FC<Props> = ({ config, onUpdate }) => (
  <Card className="overflow-hidden">
    <div className="border-b border-gray-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
      <div className="flex items-center gap-3">
        <Radio className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">الأحداث المُفعلة</h3>
          <p className="text-xs text-slate-500">اختر المعاملات التي تريد إرسال إشعارات لها</p>
        </div>
      </div>
    </div>

    <div className="divide-y dark:divide-slate-800">
      {EVENT_TOGGLES.map(event => (
        <div
          key={event.id as string}
          className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{event.emoji}</span>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{event.label}</p>
              <p className="text-[10px] text-slate-400">{event.desc}</p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={config[event.id] as boolean}
              onChange={e => {
                onUpdate({ [event.id]: e.target.checked });
              }}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-slate-700 dark:after:border-slate-600 dark:peer-focus:ring-blue-800 rtl:peer-checked:after:-translate-x-full" />
          </label>
        </div>
      ))}
    </div>
  </Card>
);

export default EventTogglesCard;
