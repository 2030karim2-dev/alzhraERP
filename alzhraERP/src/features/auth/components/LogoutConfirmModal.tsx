
import React from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface LogoutConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
}

const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isLoading
}) => {
    const { t } = useTranslation();

    const footer = (
        <div className="flex w-full gap-2 p-1">
            <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3 text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-slate-800/50 border dark:border-slate-800 uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
                {t('cancel') || 'إلغاء'}
            </button>
            <Button
                onClick={onConfirm}
                isLoading={isLoading}
                variant="danger"
                className="flex-[2] rounded-none text-[11px] font-bold bg-rose-600 border-rose-700 shadow-xl uppercase tracking-widest"
                leftIcon={<LogOut size={16} />}
            >
                {t('logout_confirm') || 'تسجيل الخروج'}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={AlertTriangle}
            title={t('logout_title') || 'تأكيد تسجيل الخروج'}
            description={t('logout_desc') || 'هل أنت متأكد أنك تريد تسجيل الخروج من النظام؟'}
            footer={footer}
            size="sm"
        >
            <div className="flex flex-col items-center justify-center py-6 px-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-4">
                    <LogOut size={32} className="text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                    {t('logout_warning') || 'سيتم مسح كافة البيانات المؤقتة وسيتم توجيهك إلى صفحة تسجيل الدخول.'}
                </p>
            </div>
        </Modal>
    );
};

export default LogoutConfirmModal;
