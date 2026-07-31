import React, { useState } from 'react';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { generateAIContent } from '../../features/ai/core/provider';
import { useFeedbackStore } from '../../features/feedback/store';
import Modal from '../base/Modal';
import Button from '../base/Button';
import { cn } from '../../core/utils';

export interface AIAssistantButtonProps {
    promptDescription: string;
    schemaDescription: string;
    contextData?: Record<string, unknown>;
    onDataExtracted: (data: Record<string, unknown>) => void;
    buttonLabel?: string;
    className?: string;
}

const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
    promptDescription,
    schemaDescription,
    contextData,
    onDataExtracted,
    buttonLabel = 'مساعد الذكاء الاصطناعي',
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { showToast } = useFeedbackStore();

    const handleProcess = async () => {
        if (!userInput.trim()) return;

        setIsProcessing(true);
        try {
            const systemInstruction = `
أنت مساعد ذكاء اصطناعي متخصص في أنظمة تخطيط موارد المؤسسات (ERP) المحاسبية.
المهمة: ${promptDescription}

بناءً على طلب المستخدم التالي، استخرج البيانات المطلوبة بدقة وقم بإرجاعها ككائن JSON فقط.
تأكد من مطابقة المعرفات (IDs) من البيانات المرجعية (Context Data) إذا كانت متوفرة.

البيانات المرجعية المتوفرة (Context Data):
${JSON.stringify(contextData || {}, null, 2)}

مخطط JSON المطلوب (Schema):
${schemaDescription}

قم بإرجاع JSON صالح فقط، بدون أي شرح إضافي أو نصوص خارج الكائن. الكائن يجب أن يكون مفصولاً بعلامات \`\`\`json \`\`\`.
            `.trim();

            const responseText = await generateAIContent(userInput, systemInstruction, { jsonMode: true, temperature: 0.1 });
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonText = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
            
            let parsedData;
            try {
                 parsedData = JSON.parse(jsonText);
            } catch (jsonErr) {
                 // Try one more time by stripping potential non-json prefix/suffix
                 const firstBrace = jsonText.indexOf('{');
                 const lastBrace = jsonText.lastIndexOf('}');
                 if (firstBrace !== -1 && lastBrace !== -1) {
                     parsedData = JSON.parse(jsonText.substring(firstBrace, lastBrace + 1));
                 } else {
                     throw new Error('فشل في تحليل استجابة الذكاء الاصطناعي.');
                 }
            }

            onDataExtracted(parsedData);
            showToast('تم استخراج البيانات بنجاح', 'success');
            setIsOpen(false);
            setUserInput('');
        } catch (error: unknown) {
            console.error('AI Extraction Error:', error);
            const errMsg = error instanceof Error ? error.message : 'حدث خطأ أثناء معالجة طلبك بواسطة الذكاء الاصطناعي';
            showToast(errMsg, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const footer = (
        <div className="flex w-full gap-2 p-1">
            <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 text-[11px] font-bold text-gray-500 bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 uppercase tracking-widest hover:bg-gray-100 transition-colors"
                disabled={isProcessing}
            >
                إلغاء
            </button>
            <Button
                onClick={handleProcess}
                isLoading={isProcessing}
                disabled={!userInput.trim() || isProcessing}
                className="flex-[2] rounded-none text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 border-indigo-700 shadow-xl uppercase tracking-widest"
                leftIcon={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            >
                تحليل وتعبئة
            </Button>
        </div>
    );

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40 rounded-xl transition-all border border-indigo-100 dark:border-indigo-800/30 shadow-sm",
                    className
                )}
                title="تعبئة ذكية باستخدام الذكاء الاصطناعي"
            >
                <Wand2 size={14} className="animate-pulse" />
                <span>{buttonLabel}</span>
            </button>

            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    onClose={() => !isProcessing && setIsOpen(false)}
                    icon={Wand2}
                    title="المساعد الذكي (AI Assistant)"
                    description="اشرح ما تريد إدخاله بلغتك الخاصة وسيقوم المساعد بتعبئة النموذج آلياً."
                    footer={footer}
                >
                    <div className="p-4 space-y-4">
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                            <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed font-medium">
                                قم بوصف العملية التي تريد القيام بها. <br />
                                <strong>على سبيل المثال:</strong> "سددت فاتورة الكهرباء بمبلغ 500 ريال نقداً من الصندوق الرئيسي". 
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-600 dark:text-slate-400">نص الطلب</label>
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="اكتب طلبك هنا..."
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 focus:border-indigo-500 rounded-2xl text-sm font-bold min-h-[120px] outline-none transition-all resize-none shadow-inner"
                                disabled={isProcessing}
                                autoFocus
                            ></textarea>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default AIAssistantButton;
