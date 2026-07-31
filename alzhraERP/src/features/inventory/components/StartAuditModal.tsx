
import React, { useState } from 'react';
import {  ClipboardCheck, Database,  CheckCircle2,  Info } from 'lucide-react';
import { useWarehouses, useInventoryMutations } from '../hooks/index';
import Button from '../../../ui/base/Button';
import Modal from '../../../ui/base/Modal';
import { cn } from '../../../core/utils';
import { useNavigate } from 'react-router-dom';

interface StartAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const StartAuditModal: React.FC<StartAuditModalProps> = ({ isOpen, onClose }) => {
    const { data: warehouses } = useWarehouses();
    const { startAudit, isStartingAudit } = useInventoryMutations();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: `جرد دوري - ${new Date().toLocaleDateString('ar-SA')}`,
        warehouse_id: '',
        category: 'all'
    });

    if (!isOpen) return null;

    const handleStart = () => {
        if (!formData.warehouse_id || !formData.title) return;
        startAudit(formData, { 
            onSuccess: (session: any) => {
                onClose();
                if (session?.id) {
                    navigate(`/inventory/audit/${session.id}`);
                }
            } 
        });
    };

    const footerContent = (
        <>
            <Button variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
            <Button
                onClick={handleStart}
                isLoading={isStartingAudit}
                disabled={!formData.warehouse_id || !formData.title}
                className="flex-1"
            >
                بدء الجلسة الآن
            </Button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={ClipboardCheck}
            title="بدء جلسة جرد ميداني"
            description="إنشاء تقرير لمطابقة الكميات الفعلية مع المسجلة بالنظام"
            footer={footerContent}
            size="xl"
        >
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 flex gap-4">
                    <Info size={24} className="text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-bold leading-relaxed">
                        يفضل استخدام باركود الأصناف أثناء الجرد لزيادة الدقة وسرعة الإنجاز.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase mr-1">اسم جلسة الجرد</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg py-3 px-4 text-sm font-bold"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase mr-1">المستودع المستهدف</label>
                        <div className="grid grid-cols-1 gap-2">
                            {warehouses?.map((w: any) => (
                                <button
                                    key={w.id}
                                    onClick={() => setFormData({ ...formData, warehouse_id: w.id })}
                                    className={cn("flex items-center justify-between p-3.5 rounded-xl border text-right transition-all",
                                        formData.warehouse_id === w.id
                                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 dark:bg-blue-900/20'
                                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Database size={18} className={formData.warehouse_id === w.id ? 'text-blue-600' : 'text-gray-400'} />
                                        <span className="text-sm font-bold">{w.name_ar || w.name}</span>
                                    </div>
                                    {formData.warehouse_id === w.id && <CheckCircle2 size={20} className="text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase mr-1">نطاق الجرد</label>
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl">
                            <button
                                onClick={() => setFormData({ ...formData, category: 'all' })}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.category === 'all' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
                            >كافة الأصناف</button>
                            <button
                                onClick={() => setFormData({ ...formData, category: 'partial' })}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${formData.category === 'partial' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-400'}`}
                            >أصناف مختارة</button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default StartAuditModal;