import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Vehicle } from '../../inventory/types';

interface Props {
    vehicle?: Vehicle | null;
    onClose: () => void;
    onSave: (v: Partial<Vehicle>) => void;
}

const VehicleModal: React.FC<Props> = ({ vehicle, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Vehicle>>(vehicle || {
        make: '', model: '', year_start: new Date().getFullYear(), year_end: new Date().getFullYear()
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-800">
                    <h3 className="text-lg font-bold">{vehicle ? 'تعديل مركبة' : 'إضافة مركبة جديدة'}</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">الشركة (Make)</label>
                            <input className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} placeholder="Toyota" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">الموديل (Model)</label>
                            <input className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="Camry" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">من سنة</label>
                            <input type="number" className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.year_start} onChange={e => setFormData({ ...formData, year_start: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">إلى سنة</label>
                            <input type="number" className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.year_end} onChange={e => setFormData({ ...formData, year_end: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">المحرك (Engine)</label>
                        <input className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.engine || ''} onChange={e => setFormData({ ...formData, engine: e.target.value })} placeholder="2.5L I4" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">ناقل الحركة</label>
                            <select className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.transmission || ''} onChange={e => setFormData({ ...formData, transmission: e.target.value })}>
                                <option value="">غير محدد</option>
                                <option value="Automatic">أوتوماتيك</option>
                                <option value="Manual">يدوي</option>
                                <option value="CVT">CVT</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">نوع الوقود</label>
                            <select className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.fuel_type || ''} onChange={e => setFormData({ ...formData, fuel_type: e.target.value })}>
                                <option value="">غير محدد</option>
                                <option value="Gasoline">بنزين</option>
                                <option value="Diesel">ديزل</option>
                                <option value="Hybrid">هجين</option>
                                <option value="Electric">كهرباء</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">نوع الدفع (Drive)</label>
                            <select className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.drive_type || ''} onChange={e => setFormData({ ...formData, drive_type: e.target.value })}>
                                <option value="">غير محدد</option>
                                <option value="FWD">دفع أمامي (FWD)</option>
                                <option value="RWD">دفع خلفي (RWD)</option>
                                <option value="AWD">دفع كلي (AWD)</option>
                                <option value="4WD">دفع رباعي (4WD)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">المواصفات (Region)</label>
                            <select className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800" value={formData.region || ''} onChange={e => setFormData({ ...formData, region: e.target.value })}>
                                <option value="">غير محدد</option>
                                <option value="GCC">خليجي (GCC)</option>
                                <option value="US">أمريكي (US)</option>
                                <option value="EU">أوروبي (EU)</option>
                                <option value="JP">ياباني (JDM)</option>
                                <option value="KR">كوري (KDM)</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">VIN Prefix (للتعرف الآلي)</label>
                        <input className="w-full p-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 font-mono tracking-widest uppercase" value={formData.vin_prefix || ''} onChange={e => setFormData({ ...formData, vin_prefix: e.target.value })} placeholder="XXXXXXXX" maxLength={10} />
                        <p className="text-[10px] text-gray-400">أول 8-10 خانات من رقم الهيكل لربط السيارة تلقائياً</p>
                    </div>
                </div>
                <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 font-bold">إلغاء</button>
                    <button onClick={() => onSave(formData)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold flex items-center gap-2">
                        <Save size={16} /> حفظ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VehicleModal;
