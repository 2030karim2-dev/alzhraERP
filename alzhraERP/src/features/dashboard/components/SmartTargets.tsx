import React from 'react';
import { Target } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface Targets {
    salesProgress?: number;
    collectionRate?: number;
}

interface Props {
    targets?: Targets | null;
}

const SmartTargets: React.FC<Props> = ({ targets }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-[var(--app-surface)] p-5 rounded-2xl text-[var(--app-text)] shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-5">
                    <Target size={18} className="text-amber-400 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">{t('monthly_targets')}</h3>
                </div>
                <div className="space-y-5">
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] font-bold text-[var(--app-text-secondary)] uppercase">{t('sales_target')}</span>
                            <span className="text-[10px] font-bold font-mono">{targets?.salesProgress || 0}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-l from-amber-400 to-amber-500 shadow-[0_0_10px_#fbbf24] transition-all duration-1000"
                                style={{ width: `${targets?.salesProgress || 0}%` }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] font-bold text-[var(--app-text-secondary)] uppercase">{t('collection_rate')}</span>
                            <span className="text-[10px] font-bold font-mono">{targets?.collectionRate || 0}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-l from-emerald-400 to-emerald-500 transition-all duration-1000"
                                style={{ width: `${targets?.collectionRate || 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5 bg-white/5 p-3 border border-[var(--app-border)] relative z-10 rounded-xl">
                <p className="text-[9px] font-bold text-blue-400 mb-1 uppercase tracking-wider">
                    {t('financial_intelligence_alert')}
                </p>
                <p className="text-[9px] font-medium text-[var(--app-text)] leading-relaxed">
                    {(targets?.salesProgress || 0) > 80
                        ? "أداء ممتاز! أنت قريب من تحقيق الهدف الشهري."
                        : "معدل المبيعات الحالي يتطلب تكثيف الجهود للوصول للهدف."}
                </p>
            </div>

            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
        </div>
    );
};

export default SmartTargets;
