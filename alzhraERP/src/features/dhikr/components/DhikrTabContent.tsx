import React from 'react';
import { Sparkles, BookOpen, HeartHandshake, Coins, ShieldCheck } from 'lucide-react';
import { DHIKR_LIST } from '../dhikrList';
import type { DhikrItem } from '../types';
import { DhikrCard } from './DhikrCard';

type TabKey =
  'tasbeeh_tahleel' | 'quran_prophet' | 'istighfar' | 'debt_rizq' | 'protection_salawat';

interface DhikrTabContentProps {
  activeTab: TabKey;
  copiedId: string | null;
  onCopy: (item: DhikrItem) => void;
  onSendToCounter: (item: DhikrItem) => void;
}

interface TabConfig {
  icon: React.ReactNode;
  bannerText: string;
  bannerClass: string;
  themeColor: string;
  items: DhikrItem[];
}

const getTabConfig = (tab: TabKey): TabConfig => {
  if (tab === 'tasbeeh_tahleel') {
    return {
      icon: <Sparkles size={16} className="shrink-0 text-teal-600" />,
      bannerText: 'أعظم التسابيح والتهليلات والتكبيرات المأثورة — أحب الكلام إلى الله وغراس الجنة',
      bannerClass: 'border-teal-500/20 bg-teal-500/10 text-teal-800 dark:text-teal-300',
      themeColor: 'bg-teal-500/20 text-teal-700 dark:text-teal-300',
      items: DHIKR_LIST.filter(
        d => d.category === 'tasbeeh' || d.category === 'tahleel' || d.category === 'takbeer'
      ),
    };
  }
  if (tab === 'quran_prophet') {
    return {
      icon: <BookOpen size={16} className="shrink-0 text-indigo-600" />,
      bannerText: 'جامع دعاء القرآن الكريم والأدعية النبوية الصحيحة المأثورة عن رسول الله ﷺ',
      bannerClass: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300',
      themeColor: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
      items: DHIKR_LIST.filter(d => d.category === 'quran_duas' || d.category === 'prophet_duas'),
    };
  }
  if (tab === 'istighfar') {
    return {
      icon: <HeartHandshake size={16} className="shrink-0 text-blue-600" />,
      bannerText: 'صيغ الاستغفار وسيد الاستغفار — مفتاح الفرج ومغفرة الذنوب وزيادة القوة والرزق',
      bannerClass: 'border-blue-500/20 bg-blue-500/10 text-blue-800 dark:text-blue-300',
      themeColor: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
      items: DHIKR_LIST.filter(d => d.category === 'istighfar'),
    };
  }
  if (tab === 'debt_rizq') {
    return {
      icon: <Coins size={16} className="shrink-0 text-amber-600" />,
      bannerText: 'أدعية سداد الدين والبركة في الرزق وطلب التيسير والفرج في العمل والمطالب',
      bannerClass: 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300',
      themeColor: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
      items: DHIKR_LIST.filter(d => d.category === 'debt_relief' || d.category === 'rizq_work'),
    };
  }
  return {
    icon: <ShieldCheck size={16} className="shrink-0 text-rose-600" />,
    bannerText: 'أدعية الحفظ والتحصين والمعوذات وفضل الصلاة والسلام على نبينا محمد ﷺ',
    bannerClass: 'border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300',
    themeColor: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
    items: DHIKR_LIST.filter(d => d.category === 'morning_evening' || d.category === 'salawat'),
  };
};

interface TabPanelProps {
  config: TabConfig;
  copiedId: string | null;
  onCopy: (item: DhikrItem) => void;
  onSendToCounter: (item: DhikrItem) => void;
}

const TabPanel: React.FC<TabPanelProps> = ({ config, copiedId, onCopy, onSendToCounter }) => (
  <div className="space-y-3">
    <div
      className={`flex items-center gap-2 rounded-2xl border p-3 text-xs font-bold ${config.bannerClass}`}
    >
      {config.icon}
      <span>{config.bannerText}</span>
    </div>
    <div className="custom-scrollbar grid max-h-[400px] grid-cols-1 gap-2.5 overflow-y-auto p-1">
      {config.items.map((item, idx) => (
        <DhikrCard
          key={item.id}
          item={item}
          idx={idx}
          themeColor={config.themeColor}
          copiedId={copiedId}
          onCopy={onCopy}
          onSendToCounter={onSendToCounter}
        />
      ))}
    </div>
  </div>
);

export const DhikrTabContent: React.FC<DhikrTabContentProps> = ({
  activeTab,
  copiedId,
  onCopy,
  onSendToCounter,
}) => {
  const config = getTabConfig(activeTab);
  return (
    <TabPanel
      config={config}
      copiedId={copiedId}
      onCopy={onCopy}
      onSendToCounter={onSendToCounter}
    />
  );
};
