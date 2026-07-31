
import React, { useState } from 'react';
import { Bell, ShieldAlert, Package, MessageSquare, Save } from 'lucide-react';
import { useFeedbackStore } from '../../../feedback/store';
import Button from '../../../../ui/base/Button';
import MicroListItem from '../../../../ui/common/MicroListItem';
import ToggleSwitch from './ToggleSwitch';

const NotificationSettings: React.FC = () => {
  const { showToast } = useFeedbackStore();
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    stock: true,
    debt: true,
    marketing: false,
    system: true
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast("تم حفظ تفضيلات الإشعارات", 'success');
    }, 1000);
  };

  const settings = [
    { id: 'stock', title: 'تنبيهات المخزون', desc: 'عند وصول الأصناف للحد الأدنى', icon: Package, color: 'text-amber-500' },
    { id: 'debt', title: 'مواعيد الديون', desc: 'تذكير باستحقاق ديون العملاء', icon: ShieldAlert, color: 'text-rose-500' },
    { id: 'system', title: 'تحديثات النظام', desc: 'حول الميزات الجديدة والصيانة', icon: Bell, color: 'text-blue-500' },
    { id: 'marketing', title: 'نصائح ذكاء الأعمال', desc: 'تحليلات أسبوعية للأداء', icon: MessageSquare, color: 'text-purple-500' },
  ];

  return (
    <div className="p-3 md:p-4 animate-in max-w-4xl mx-auto space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">مركز الإشعارات</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">إدارة التنبيهات والرسائل</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving} className="rounded-xl px-6" leftIcon={<Save size={16}/>}>حفظ</Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 shadow-sm overflow-hidden divide-y dark:divide-slate-800">
         {settings.map((item) => (
           <MicroListItem
             key={item.id}
             icon={item.icon}
             iconColorClass={item.color}
             title={item.title}
             subtitle={item.desc}
             actions={
                <ToggleSwitch 
                    checked={prefs[item.id as keyof typeof prefs]}
                    onChange={(checked) => setPrefs({...prefs, [item.id as keyof typeof prefs]: checked})}
                />
             }
           />
         ))}
      </div>
    </div>
  );
};

export default NotificationSettings;
