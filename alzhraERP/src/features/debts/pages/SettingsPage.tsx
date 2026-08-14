import React from 'react';
import { SlidersHorizontal, MessageSquareText } from 'lucide-react';
import FollowUpSettingsForm from '../components/FollowUpSettingsForm';
import TemplateManager from '../components/TemplateManager';

const SettingsPage: React.FC = () => (
  <div className="space-y-5">
    <section className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm">
      <header className="p-4 border-b border-[var(--app-border)] flex items-center gap-2">
        <span className="p-1.5 bg-blue-500 text-white rounded-lg">
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

    <section className="bg-[var(--app-surface)] rounded-2xl border border-[var(--app-border)] shadow-sm">
      <header className="p-4 border-b border-[var(--app-border)] flex items-center gap-2">
        <span className="p-1.5 bg-green-500 text-white rounded-lg">
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
        <TemplateManager />
      </div>
    </section>
  </div>
);

export default SettingsPage;
