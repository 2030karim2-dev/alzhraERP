import { useState, useRef } from 'react';

// 🔒 Lazy-load the heavy xlsx library only when actually needed.
let xlsxPromise: Promise<any> | null = null;
const loadXLSX = (): Promise<any> => {
  xlsxPromise ??= import('xlsx-js-style').then((m: any) => m.default ?? m);
  return xlsxPromise;
};

export const useExcelImport = () => {
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
      reader.onload = async evt => {
        try {
          const XLSX = await loadXLSX();
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          setPreview(data.slice(0, 5)); // Show first 5 rows
        } catch (err) {
          setErrorMsg('فشل في قراءة ملف Excel');
          setStatus('error');
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setStatus('uploading');
    // Direct server-side Excel import is not wired to `products` yet.
    // Fail HONESTLY instead of the previous fake-success path (the old
    // placeholder returned resolved without importing anything).
    setErrorMsg(
      'الاستيراد المباشر من Excel غير مفعّل بعد — استخدم شبكة Excel التفاعلية لإضافة الأصناف'
    );
    setStatus('error');
  };

  const downloadTemplate = async () => {
    const XLSX = await loadXLSX();
    const ws = XLSX.utils.json_to_sheet([
      {
        'اسم المنتج': 'فحمات فرامل',
        'رقم الصنف': 'BP-001',
        الشركة: 'Toyota',
        'سعر البيع': 150,
        التكلفة: 100,
        الكمية: 50,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Inventory_Template.xlsx');
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
    reset,
  };
};
