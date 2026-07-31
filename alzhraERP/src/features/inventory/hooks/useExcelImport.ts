import { useState, useRef } from 'react';
import { useAuthStore } from '../../auth/store';
import { useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../service';
import * as _XLSX from 'xlsx-js-style';
const XLSX = _XLSX as any;

export const useExcelImport = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [preview, setPreview] = useState<any[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setStatus('idle');
            setErrorMsg('');

            // Quick Preview
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    setPreview(data.slice(0, 5)); // Show first 5 rows
                } catch (err) {
                    setErrorMsg("فشل في قراءة ملف Excel");
                    setStatus('error');
                }
            };
            reader.readAsBinaryString(selectedFile);
        }
    };

    const handleImport = async () => {
        if (!file || !user?.company_id || !user?.id) return;

        setStatus('uploading');
        try {
            await inventoryService.processImportFile(file, user.company_id, user.id);
            setStatus('success');
            queryClient.invalidateQueries({ queryKey: ['products'] });
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء معالجة الملف");
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { "اسم المنتج": "فحمات فرامل", "رقم الصنف": "BP-001", "الشركة": "Toyota", "سعر البيع": 150, "التكلفة": 100, "الكمية": 50 }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Inventory_Template.xlsx");
    };

    const reset = () => {
        setFile(null);
        setStatus('idle');
        setErrorMsg('');
        setPreview([]);
    };

    return {
        file,
        status,
        errorMsg,
        preview,
        fileInputRef,
        handleFileChange,
        handleImport,
        downloadTemplate,
        reset
    };
};
