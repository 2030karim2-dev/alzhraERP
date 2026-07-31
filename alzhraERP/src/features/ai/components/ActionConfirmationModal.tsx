import React from 'react';
import { AIParsedResponse } from '../core/types';
import Button from '../../../ui/base/Button';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { CheckCircle2, User as UserIcon, Wallet, CalendarDays, FileText, PackageSearch, Tag, Info, Banknote } from 'lucide-react';

interface ActionConfirmationModalProps {
    action: AIParsedResponse | null;
    onConfirm: () => void;
    onCancel: () => void;
    isExecuting?: boolean;
}

export const ActionConfirmationModal: React.FC<ActionConfirmationModalProps> = ({
    action,
    onConfirm,
    onCancel,
    isExecuting
}) => {
    const { t } = useTranslation();

    if (!action || action.intent === 'chat' || action.intent === 'unknown') return null;

    const { intent, entities } = action;

    const getIntentLabel = (intent: string) => {
        const labels: Record<string, string> = {
            create_sales_invoice: 'إنشاء فاتورة مبيعات',
            create_return_sale: 'إنشاء مرتجع مبيعات',
            create_purchase_invoice: 'إنشاء فاتورة مشتريات',
            create_return_purchase: 'إنشاء مرتجع مشتريات',
            create_expense: 'تسجيل مصروف',
            create_bond_receipt: 'سند قبض',
            create_bond_payment: 'سند صرف',
            create_customer: 'إضافة عميل جديد',
            create_supplier: 'إضافة مورد جديد',
            create_product: 'إضافة منتج جديد',
            statement_of_account: 'عرض كشف حساب',
            journal_entry: 'إنشاء قيد يومية',
        };
        return labels[intent] || intent;
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        تأكيد الإجراء: {getIntentLabel(intent)}
                    </h3>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg text-indigo-800 dark:text-indigo-300 items-start gap-3">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{action.replyText}</p>
                    </div>

                    {entities && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700/60 shadow-inner">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                التفاصيل المستخرجة للمعاملة
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                {entities.partyName && (
                                    <div className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                                        <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">الطرف</span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">{entities.partyName}</span>
                                        </div>
                                    </div>
                                )}
                                {entities.amount !== undefined && (
                                    <div className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                                        <Wallet className="w-5 h-5 text-emerald-500 mt-0.5" />
                                        <div>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">المبلغ</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{entities.amount}</span>
                                        </div>
                                    </div>
                                )}
                                {entities.paymentMethod && (
                                    <div className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                                        <Banknote className="w-5 h-5 text-blue-500 mt-0.5" />
                                        <div>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">طريقة الدفع</span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                {entities.paymentMethod === 'cash' ? 'نقدي (كاش)' : entities.paymentMethod === 'bank' ? 'تحويل بنكي' : entities.paymentMethod}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {entities.date && (
                                    <div className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                                        <CalendarDays className="w-5 h-5 text-orange-500 mt-0.5" />
                                        <div>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">التاريخ</span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">{entities.date}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {entities.description && (
                                <div className="mt-4 flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div className="w-full">
                                        <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">ملاحظات والتفاصيل</span>
                                        <span className="text-gray-800 dark:text-gray-200 block mt-1">{entities.description}</span>
                                    </div>
                                </div>
                            )}
                            
                            {entities.items && entities.items.length > 0 && (
                                <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 text-sm">
                                        <PackageSearch className="w-4 h-4 text-indigo-500" />
                                        الأصناف المشمولة ({entities.items.length})
                                    </h5>
                                    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden flex flex-col gap-[1px] bg-gray-100 dark:bg-gray-700">
                                        {entities.items.map((item, idx) => (
                                            <div key={idx} className="bg-white dark:bg-gray-800 p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                <div className="flex-shrink-0 w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                    {item.quantity}x
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        {item.productName}
                                                        {item.productCode && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 pl-1.5 py-0.5 rounded-full inline-flex items-center gap-1"><Tag className="w-3 h-3" />{item.productCode}</span>}
                                                    </div>
                                                    {item.manufacturer && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">الشركة المصنعة: {item.manufacturer}</div>}
                                                </div>
                                                {item.unitPrice && (
                                                    <div className="text-left flex-shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {item.unitPrice} <span className="text-xs font-normal text-gray-500">سعر</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onCancel} disabled={isExecuting}>
                        {t('cancel')}
                    </Button>
                    <Button variant="primary" onClick={onConfirm} isLoading={!!isExecuting}>
                        تأكيد وتنفيذ
                    </Button>
                </div>
            </div>
        </div>
    );
};
