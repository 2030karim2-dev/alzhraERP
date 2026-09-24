/* eslint-disable max-lines-per-function, @typescript-eslint/no-confusing-void-expression */
import React from 'react';
import { Palette, Type, Image as ImageIcon, Sliders, MessageSquare } from 'lucide-react';
import type { StudioActiveTab } from './constants';

interface HeaderStudioTabsProps {
  activeTab: StudioActiveTab;
  setActiveTab: (tab: StudioActiveTab) => void;
}

export const HeaderStudioTabs: React.FC<HeaderStudioTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100 p-1 text-xs font-medium dark:border-slate-700/60 dark:bg-slate-800/60">
      <button
        type="button"
        onClick={() => setActiveTab('design')}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
          activeTab === 'design'
            ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        <Palette className="h-3.5 w-3.5" />
        <span>التخطيط والمظهر</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('typography')}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
          activeTab === 'typography'
            ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        <Type className="h-3.5 w-3.5" />
        <span>الخطوط والنصوص</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('logo')}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
          activeTab === 'logo'
            ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        <ImageIcon className="h-3.5 w-3.5" />
        <span>الشعار والبانر</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('details')}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
          activeTab === 'details'
            ? 'bg-white font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        <Sliders className="h-3.5 w-3.5" />
        <span>بيانات الترويسة</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('whatsapp')}
        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all ${
          activeTab === 'whatsapp'
            ? 'bg-white font-bold text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>الواتساب</span>
      </button>
    </div>
  );
};
