import React from 'react';
import { Users, CreditCard, ShoppingCart, AlertCircle } from 'lucide-react';
import { PartyStats, PartyType } from '../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface Props {
  stats: PartyStats;
  type: PartyType;
}

const PartiesStats: React.FC<Props> = ({ stats, type }) => {
  const { t } = useTranslation();
  const isCustomer = type === 'customer';

  const cards = [
    {
      title: isCustomer ? t('total_customers') : t('total_suppliers'),
      value: formatNumberDisplay(stats.totalCount),
      icon: Users,
      gradient: isCustomer ? "from-emerald-500 to-teal-600" : "from-blue-500 to-indigo-600",
      shadow: isCustomer ? "shadow-emerald-200/50" : "shadow-blue-200/50",
    },
    {
      title: t('total_balances'),
      value: formatCurrency(stats.totalBalance),
      icon: CreditCard,
      gradient: "from-rose-500 to-pink-600",
      shadow: "shadow-rose-200/50",
    },
    {
      title: t('active_records'),
      value: formatNumberDisplay(stats.activeCount),
      icon: ShoppingCart,
      gradient: isCustomer ? "from-emerald-400 to-emerald-500" : "from-blue-400 to-blue-500",
      shadow: isCustomer ? "shadow-emerald-100/30" : "shadow-blue-100/30",
    },
    {
      title: t('blocked_records'),
      value: formatNumberDisplay(stats.blockedCount),
      icon: AlertCircle,
      gradient: "from-orange-400 to-orange-500",
      shadow: "shadow-orange-100/30",
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={cn(
            "relative overflow-hidden group p-4 rounded-2xl border border-white/20 shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-xl",
            "bg-gradient-to-br", card.gradient, card.shadow
          )}
        >
          {/* Decorative Pattern */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-150 transition-transform duration-700" />

          <div className="flex flex-col relative z-10">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
                {card.title}
              </span>
              <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md">
                <card.icon size={16} className="text-white" />
              </div>
            </div>

            <h3 className="text-xl md:text-2xl font-bold text-white font-mono leading-none tracking-tighter truncate drop-shadow-sm">
              {card.value}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PartiesStats;
