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
    { id: 'notify_on_purchase', label: 'المشتريات', desc: 'إشعار عند إنشاء فاتورة شراء', emoji: '📦' },
    { id: 'notify_on_bond', label: 'السندات', desc: 'إشعار عند إنشاء سند قبض أو صرف', emoji: '💵' },
    { id: 'notify_on_expense', label: 'المصروفات', desc: 'إشعار عند تسجيل مصروف', emoji: '🏷️' },
    { id: 'notify_on_stock_transfer', label: 'تحويلات المخزون', desc: 'إشعار عند تحويل بين المستودعات', emoji: '🔄' },
    { id: 'notify_on_low_stock', label: 'تنبيه المخزون', desc: 'إشعار عند وصول صنف للحد الأدنى', emoji: '⚠️' },
];

interface Props {
    config: MessagingConfig;
    onUpdate: (updates: Partial<MessagingConfig>) => void;
}

const EventTogglesCard: React.FC<Props> = ({ config, onUpdate }) => (
    <Card className="overflow-hidden">
        <div className="bg-gradient-to-l from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4 border-b dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
                    <Radio className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">الأحداث المُفعلة</h3>
                    <p className="text-xs text-slate-500">اختر المعاملات التي تريد إرسال إشعارات لها</p>
                </div>
            </div>
        </div>

        <div className="divide-y dark:divide-slate-800">
            {EVENT_TOGGLES.map((event) => (
                <div
                    key={event.id as string}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{event.emoji}</span>
                        <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{event.label}</p>
                            <p className="text-[10px] text-slate-400">{event.desc}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config[event.id] as boolean}
                            onChange={(e) => onUpdate({ [event.id]: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600" />
                    </label>
                </div>
            ))}
        </div>
    </Card>
);

export default EventTogglesCard;
