import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Calendar, ShoppingCart, ArrowRight, Zap } from 'lucide-react';
import { ProcurementRecommendation } from '../services/procurementEngine';
import { cn } from '../../../core/utils';

interface PredictiveProcurementProps {
  recommendations: ProcurementRecommendation[];
}

const PredictiveProcurement: React.FC<PredictiveProcurementProps> = ({ recommendations }) => {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 flex items-center justify-center">
            <TrendingUp size={14} className="text-white" />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
            مركز التنبؤ بالمشتريات الذكي
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-none">
          <Zap size={10} className="text-emerald-500" />
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">AI Engine Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.partId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-none p-3 shadow-sm relative overflow-hidden group"
          >
            {/* Priority Indicator */}
            <div className={cn(
              "absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45",
              rec.priority === 'CRITICAL' ? "bg-rose-600" : 
              rec.priority === 'HIGH' ? "bg-orange-500" : "bg-blue-500"
            )} />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-[11px] font-black text-[var(--app-text)] uppercase tracking-tight">{rec.partName}</h4>
                  <p className="text-[9px] font-mono text-[var(--app-text-secondary)] font-bold">{rec.oemNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-white uppercase tracking-tighter bg-black/20 px-1.5 py-0.5">
                    {rec.priority}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-[var(--app-bg)] p-2 border border-[var(--app-border)] text-center">
                  <p className="text-[7px] font-black text-[var(--app-text-secondary)] uppercase">المخزون</p>
                  <p className="text-[12px] font-black text-[var(--app-text)]">{rec.currentStock}</p>
                </div>
                <div className="bg-blue-600/5 p-2 border border-blue-600/20 text-center">
                  <p className="text-[7px] font-black text-blue-600 uppercase">المقترح</p>
                  <p className="text-[12px] font-black text-blue-600">+{rec.recommendedOrder}</p>
                </div>
                <div className="bg-orange-500/5 p-2 border border-orange-500/20 text-center">
                  <p className="text-[7px] font-black text-orange-600 uppercase">النفاد خلال</p>
                  <p className="text-[12px] font-black text-orange-600">{rec.predictedShortageDays}ي</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={12} className="text-orange-500 shrink-0" />
                <p className="text-[9px] font-black text-[var(--app-text-secondary)] leading-tight italic">
                  "{rec.reason}"
                </p>
              </div>

              <button className="w-full bg-black dark:bg-white text-white dark:text-black py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white transition-all rounded-none">
                <ShoppingCart size={12} /> إضافة لطلب الشراء
                <ArrowRight size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PredictiveProcurement;
