
import React from 'react';
import {   AlertTriangle, Layers, TrendingDown, Wallet } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../../core/utils';
import { cn } from '../../../core/utils';

interface InventoryStatsProps {
  stats: any;
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ stats }) => {
  const cards = [
    { title: 'إجمالي الأصناف', value: formatNumberDisplay(stats.count), icon: Layers, color: 'text-blue-600', bg: 'bg-blue-500' },
    { title: 'قيمة الأصول', value: formatCurrency(stats.totalValue), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-500' },
    { title: 'نواقص حرجة', value: formatNumberDisplay(stats.lowStockCount), icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500' },
    { title: 'راكد (180 يوم)', value: '12', icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-3 transition-all hover:shadow-md group">
          <div className={cn("p-2 rounded-xl text-white shadow-lg shadow-current/10 group-hover:scale-110 transition-transform", card.bg)}>
            <card.icon size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{card.title}</span>
            <h3 className={cn("text-xs font-bold font-mono leading-none truncate", card.color)}>{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryStats;
