import React from 'react';
import { AlertTriangle,  Copy } from 'lucide-react';
// import { cn } from '../../../core/utils';

interface SimilarProduct {
    id: string;
    name_ar: string;
    sku: string;
    similarity: number;
}

interface Props {
    similarProducts: SimilarProduct[];
    onApplyName: (name: string) => void;
    isVisible: boolean;
}

const SimilarityAdvisor: React.FC<Props> = ({ similarProducts, onApplyName, isVisible }) => {
    if (!isVisible || similarProducts.length === 0) return null;

    return (
        <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-800 rounded-full text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={14} />
                </div>
                <h5 className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    وجدنا أصنافاً بأسماء مشابهة جداً
                </h5>
            </div>

            <div className="space-y-2">
                {similarProducts.map((p) => (
                    <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-800/20 rounded-lg group transition-all hover:border-amber-300 dark:hover:border-amber-700"
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{p.name_ar}</span>
                            <span className="text-[8px] font-mono text-gray-400 uppercase">{p.sku}</span>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onApplyName(p.name_ar)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="استخدام نفس الاسم"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-3 text-[9px] text-amber-600/70 dark:text-amber-400/50 leading-relaxed italic">
                * ننصح بتعديل الاسم لتجنب التكرار، أو استخدام اسم المنتج الحالي إذا كان هو نفسه.
            </p>
        </div>
    );
};

export default SimilarityAdvisor;
