
import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowLeftRight } from 'lucide-react';
import { aiService } from '../../ai/service';

interface Props {
    description: string;
    amount: number;
}

const SmartJournalSuggestion: React.FC<Props> = ({ description, amount }) => {
    const [result, setResult] = useState<{ debitAccount: string; creditAccount: string; explanation: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const suggest = async () => {
        if (!description || !amount) return;
        setIsLoading(true);
        try {
            const data = await aiService.suggestJournalEntry(description, amount);
            setResult(data);
        } catch { /* ignore */ }
        setIsLoading(false);
    };

    if (!description || !amount) return null;

    return (
        <div className="mt-2">
            {!result ? (
                <button
                    onClick={suggest}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 hover:text-violet-500 transition-colors"
                >
                    {isLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    اقتراح القيد المحاسبي بالذكاء الاصطناعي
                </button>
            ) : (
                <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 rounded-xl p-3 space-y-2">
                    <p className="text-[9px] font-bold text-violet-600 uppercase">اقتراح AI للقيد المحاسبي</p>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-bold flex-1 text-center">
                            مدين: {result.debitAccount}
                        </span>
                        <ArrowLeftRight size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg font-bold flex-1 text-center">
                            دائن: {result.creditAccount}
                        </span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400">{result.explanation}</p>
                </div>
            )}
        </div>
    );
};

export default SmartJournalSuggestion;
