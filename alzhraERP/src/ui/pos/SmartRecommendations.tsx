import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../features/ai/service';
import Spinner from '../base/Spinner';

interface CartItemLike {
  productId: string;
  productName?: string;
  name?: string;
}

interface Props {
  cartItems: CartItemLike[];
  onAdd: (partName: string) => void;
}

const SmartRecommendations: React.FC<Props> = ({ cartItems, onAdd }) => {
  const queryKey = React.useMemo(
    () => [
      'pos_ai_suggestions',
      cartItems
        .map(i => i.productId)
        .sort()
        .join(','),
    ],
    [cartItems]
  );

  const { data: suggestions, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      aiService.suggestCrossSell(
        cartItems.map(item => item.productName || item.name || item.productId)
      ),
    enabled: cartItems.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (cartItems.length === 0) return null;

  return (
    <div className="animate-in slide-in-from-bottom-4 relative overflow-hidden rounded-[1.5rem] bg-blue-600 p-3 text-white shadow-xl shadow-blue-500/20 duration-500">
      <div className="relative z-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} className="animate-pulse text-amber-300" />
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-100">
            توصيات ذكاء الزهراء
          </h4>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Spinner size="sm" className="text-white" />
            <span className="text-[10px] font-bold opacity-70">جاري تحليل احتياجات المحرك...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {suggestions?.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onAdd(item);
                }}
                className="group flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold transition-all hover:bg-white/20 active:scale-95"
              >
                <span>{item}</span>
                <Plus size={10} className="transition-transform group-hover:rotate-90" />
              </button>
            ))}
            {(!suggestions || suggestions.length === 0) && (
              <span className="text-[10px] font-bold opacity-50">لا توجد توصيات إضافية حالياً</span>
            )}
          </div>
        )}
      </div>

      <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>
    </div>
  );
};

export default SmartRecommendations;
