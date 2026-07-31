
import React, { useState } from 'react';
import { Sparkles, X, Loader2, AlertCircle, Save } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { aiCategoryService, ClassificationResult } from '../../services/aiCategoryService';
import { useAuthStore } from '../../../auth/store';
import { useFeedbackStore } from '../../../feedback/store';
import { useInventoryCategories } from '../../hooks/useInventoryManagement';
import { aiFeedback } from '../../../ai/core/feedback';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const AICategoryReviewModal: React.FC<Props> = ({ isOpen, onClose, onComplete }) => {
    const { user } = useAuthStore();
    const { showToast } = useFeedbackStore();
    const { data: currentCategories } = useInventoryCategories();

    const [step, setStep] = useState<'scan' | 'review' | 'applying'>('scan');
    const [results, setResults] = useState<ClassificationResult[]>([]);
    const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasProcessed, setHasProcessed] = useState(false);

    const startClassification = async () => {
        if (!user?.company_id || !currentCategories) return;

        setIsProcessing(true);
        try {
            // Get a batch of 15 products for preview
            const uncategorized = await aiCategoryService.getUncategorizedProducts(user.company_id, 15);

            if (uncategorized.length === 0) {
                showToast('جميع المنتجات مصنفة بالفعل', 'info');
                onClose();
                return;
            }

            const classifications = await aiCategoryService.classifyBatch(
                (uncategorized || []) as { id: string; name_ar: string }[],
                (currentCategories || []) as { id: string; name: string }[]
            );

            setResults(classifications);
            setAcceptedIds(new Set(classifications.map(r => r.product_id)));
            setStep('review');
        } catch (error) {
            const err = error as Error;
            showToast(err.message || 'فشل البدء في التصنيف الذكي', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = async () => {
        if (!user?.company_id) return;

        const toApply = results.filter(r => acceptedIds.has(r.product_id));
        if (toApply.length === 0) return;

        // Record feedback for all results
        results.forEach(r => {
            aiFeedback.recordFeedback({
                taskType: 'product_categorization',
                originalInput: { product_id: r.product_id, name_ar: r.product_name },
                aiOutput: { category_id: r.suggested_category_id, confidence: r.confidence },
                userAccepted: acceptedIds.has(r.product_id)
            });
        });

        setIsProcessing(true);
        setStep('applying');
        try {
            await aiCategoryService.applyChanges(user.company_id, toApply);
            showToast(`تم تحديث ${toApply.length} منتج بنجاح`, 'success');
            onComplete();

            // Instead of closing, prepare for next batch
            setResults([]);
            setAcceptedIds(new Set());
            setHasProcessed(true);
            setStep('scan'); // Go back to scan step to allow next batch
        } catch (error) {
            const err = error as Error;
            showToast(err.message || 'فشل تطبيق التغييرات', 'error');
            setStep('review');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleAccepted = (id: string) => {
        const next = new Set(acceptedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setAcceptedIds(next);
    };

    const updateResult = <K extends keyof ClassificationResult>(
        id: string,
        field: K,
        value: ClassificationResult[K]
    ) => {
        setResults(prev => prev.map(r =>
            r.product_id === id ? { ...r, [field]: value } : r
        ));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded shadow-sm">
                            <Sparkles size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold dark:text-white">المساعد الذكي لتصنيف المنتجات</h3>
                            <p className="text-[10px] text-gray-500">يقوم الذكاء الاصطناعي بتحليل أسماء المنتجات واقتراح التصنيف الأفضل لها.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {step === 'scan' && (
                        <div className="h-64 flex flex-col items-center justify-center text-center gap-4">
                            {!isProcessing ? (
                                <>
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400">
                                        <Sparkles size={48} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold mb-1 dark:text-white">
                                            {hasProcessed ? 'تم تطبيق المعالجة السابقة بنجاح' : 'جاهز لبدء التصنيف الذكي'}
                                        </h4>
                                        <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                                            {hasProcessed ? 'يمكنك الاستمرار وتصنيف الـ 15 منتج التالية.' : 'سيتم فحص المنتجات غير المصنفة أو المصنفة تحت "عام" واقتراح تصنيفات مناسبة لها.'}
                                        </p>
                                    </div>
                                    <Button onClick={startClassification} className="px-10 rounded-none h-10 font-bold">
                                        {hasProcessed ? 'فحص الـ 15 التالية' : 'ابدأ الفحص الآن'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Loader2 size={40} className="animate-spin text-blue-600" />
                                    <p className="text-[11px] font-bold text-gray-500">جاري تحليل المنتجات بواسطة الذكاء الاصطناعي...</p>
                                </>
                            )}
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400">
                                <div className="flex items-center gap-2 text-[11px] font-bold">
                                    <AlertCircle size={14} />
                                    <span>تم العثور على {results.length} اقتراح، يرجى مراجعتها والموافقة عليها.</span>
                                </div>
                                <button
                                    onClick={() => setAcceptedIds(new Set(results.map(r => r.product_id)))}
                                    className="text-[10px] underline"
                                >
                                    اختيار الكل
                                </button>
                            </div>

                            <div className="border border-gray-100 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-right border-collapse">
                                    <thead className="bg-gray-50 dark:bg-slate-800 text-[10px] font-bold text-gray-500 uppercase">
                                        <tr>
                                            <th className="p-3 border-b dark:border-slate-700 w-10"></th>
                                            <th className="p-3 border-b dark:border-slate-700">المنتج</th>
                                            <th className="p-3 border-b dark:border-slate-700">التصنيف المقترح</th>
                                            <th className="p-3 border-b dark:border-slate-700">السبب</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {results.map((res) => (
                                            <tr key={res.product_id} className={
                                                `transition-colors ${acceptedIds.has(res.product_id) ? "bg-white dark:bg-slate-900" : "bg-gray-50/50 dark:bg-slate-900/20 opacity-60"}`
                                            }>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={acceptedIds.has(res.product_id)}
                                                        onChange={() => toggleAccepted(res.product_id)}
                                                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <p className="text-[10px] font-bold dark:text-slate-200">{res.product_name}</p>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex flex-col gap-1">
                                                        <input
                                                            type="text"
                                                            value={res.suggested_category_name}
                                                            onChange={(e) => updateResult(res.product_id, 'suggested_category_name', e.target.value)}
                                                            className="text-[10px] bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none py-0.5 px-0 dark:text-slate-200"
                                                        />
                                                        <label className="flex items-center gap-1 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={res.is_new_category}
                                                                onChange={(e) => updateResult(res.product_id, 'is_new_category', e.target.checked)}
                                                                className="h-2.5 w-2.5 rounded border-gray-300 text-purple-600"
                                                            />
                                                            <span className="text-[8px] text-gray-500">قسم جديد</span>
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-[9px] text-gray-400 dark:text-slate-500 italic max-w-xs">{res.reasoning}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'applying' && (
                        <div className="h-64 flex flex-col items-center justify-center text-center gap-4">
                            <Loader2 size={48} className="animate-spin text-blue-600" />
                            <div>
                                <h4 className="text-sm font-bold mb-1 dark:text-white">جاري تطبيق التغييرات</h4>
                                <p className="text-[11px] text-gray-500">نقوم الآن بتحديث قاعدة البيانات ببالأقسام الجديدة...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                    <Button variant="ghost" onClick={onClose} size="sm">إلغاء</Button>
                    {step === 'review' && (
                        <div className="flex items-center gap-3">
                            <p className="text-[10px] text-gray-500 font-bold">تم اختيار {acceptedIds.size} من أصل {results.length}</p>
                            <Button
                                onClick={handleApply}
                                isLoading={isProcessing}
                                size="sm"
                                className="px-6 rounded-none bg-blue-600 hover:bg-blue-700"
                            >
                                <Save size={14} className="ml-2" />
                                اعتماد التغييرات
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AICategoryReviewModal;


