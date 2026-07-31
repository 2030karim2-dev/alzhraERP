
import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { aiPosService } from '../../features/ai/posService';
import { CartItem } from '../../features/sales/types';
import Spinner from '../base/Spinner';

interface Props {
  cartItems: CartItem[];
  onAdd: (partName: string) => void;
}

const SmartRecommendations: React.FC<Props> = ({ cartItems, onAdd }) => {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['pos_ai_suggestions', cartItems.map(i => i.productId)],
    queryFn: () => aiPosService.getComplementaryParts(cartItems),
    enabled: cartItems.length > 0,
  });

  if (cartItems.length === 0) return null;

  return (
    <div className="p-3 bg-blue-600 rounded-[1.5rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-amber-300 animate-pulse" />
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-blue-100">توصيات ذكاء الزهراء</h4>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" className="text-white" />
            <span className="text-[8px] font-bold opacity-70">جاري تحليل احتياجات المحرك...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {suggestions?.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onAdd(item)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1 rounded-lg text-[8px] font-semibold transition-all flex items-center gap-1.5 active:scale-95 group"
              >
                <span>{item}</span>
                <Plus size={10} className="group-hover:rotate-90 transition-transform" />
              </button>
            ))}
            {(!suggestions || suggestions.length === 0) && (
              <span className="text-[8px] font-bold opacity-50">لا توجد توصيات إضافية حالياً</span>
            )}
          </div>
        )}
      </div>

      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
    </div>
  );
};

export default SmartRecommendations;
