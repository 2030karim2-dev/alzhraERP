import React from 'react';
import { SlidersHorizontal, MessageSquareText, Bot } from 'lucide-react';
import FollowUpSettingsForm from '../components/FollowUpSettingsForm';
import AutoSendSettingsCard from '../components/AutoSendSettingsCard';
import ChannelSettingsCard from '../components/ChannelSettingsCard';
import SeedTemplatesCard from '../components/SeedTemplatesCard';
import TemplateManager from '../components/TemplateManager';

const SettingsPage: React.FC = () => (
  <div className="space-y-5">
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <header className="flex items-center gap-2 border-b border-[var(--app-border)] p-4">
        <span className="rounded-lg bg-blue-500 p-1.5 text-white">
          <SlidersHorizontal size={14} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[var(--app-text)]">محرك المتابعة</h3>
          <p className="text-[10px] text-[var(--app-text-secondary)]">
            فترات التصنيف ونافذة التذكير — تُحسب التصنيفات في قاعدة البيانات
          </p>
        </div>
      </header>
      <div className="p-4">
        <FollowUpSettingsForm />
      </div>
    </section>

    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <header className="flex items-center gap-2 border-b border-[var(--app-border)] p-4">
        <span className="rounded-lg bg-indigo-500 p-1.5 text-white">
          <Bot size={14} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[var(--app-text)]">الإرسال الآلي</h3>
          <p className="text-[10px] text-[var(--app-text-secondary)]">
            تشغيل التذكيرات المجدولة، نافذة الهدوء، السقف اليومي، ومفتاح الدولة
          </p>
        </div>
      </header>
      <div className="p-4">
        <AutoSendSettingsCard />
      </div>
    </section>

    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <header className="flex items-center gap-2 border-b border-[var(--app-border)] p-4">
        <span className="rounded-lg bg-green-500 p-1.5 text-white">
          <MessageSquareText size={14} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-[var(--app-text)]">قوالب رسائل التذكير</h3>
          <p className="text-[10px] text-[var(--app-text-secondary)]">
            قوالب واتساب مع متغيرات ديناميكية
          </p>
        </div>
      </header>
      <div className="p-4">
        <ChannelSettingsCard />
        <SeedTemplatesCard />
        <TemplateManager />
      </div>
    </section>
  </div>
);

export default SettingsPage;
