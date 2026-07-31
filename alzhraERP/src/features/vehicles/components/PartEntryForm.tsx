import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { PartEntry } from '../types';

interface PartEntryFormProps {
    onAdd: (data: Omit<PartEntry, 'id'>) => void;
    onCancel: () => void;
    decodedVehicle: any;
}

export const PartEntryForm: React.FC<PartEntryFormProps> = ({ onAdd, onCancel, decodedVehicle }) => {
    const [partNumber, setPartNumber] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [brand, setBrand] = useState(decodedVehicle?.make || '');
    const [source, setSource] = useState('PartsOuq');

    const handleSubmit = () => {
        if (!partNumber.trim()) return;
        onAdd({
            partNumber: partNumber.trim(),
            nameAr: nameAr.trim(),
            nameEn: nameEn.trim(),
            brand: brand.trim(),
            source,
            action: 'new',
        });
        setPartNumber('');
        setNameAr('');
        setNameEn('');
    };

    return (
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-b dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">رقم القطعة *</label>
                    <input
                        className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 text-sm font-mono tracking-wider uppercase"
                        placeholder="04465-33471"
                        value={partNumber}
                        onChange={e => setPartNumber(e.target.value)}
                        dir="ltr"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">الاسم بالعربية</label>
                    <input className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 text-sm" placeholder="فحمات فرامل أمامية" value={nameAr} onChange={e => setNameAr(e.target.value)} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">الاسم بالإنجليزية</label>
                    <input className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 text-sm" placeholder="Front Brake Pads" value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">الماركة</label>
                    <input className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 text-sm" value={brand} onChange={e => setBrand(e.target.value)} dir="ltr" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">المصدر</label>
                    <select className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 text-sm" value={source} onChange={e => setSource(e.target.value)}>
                        <option value="PartsOuq">PartsOuq</option>
                        <option value="Afyal">Afyal</option>
                        <option value="ToyoDIY">ToyoDIY</option>
                        <option value="أخرى">أخرى</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
                <button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 text-xs font-bold">إلغاء</button>
                <button
                    onClick={handleSubmit}
                    disabled={!partNumber.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                    <Plus size={14} /> إضافة للقائمة
                </button>
            </div>
        </div>
    );
};
