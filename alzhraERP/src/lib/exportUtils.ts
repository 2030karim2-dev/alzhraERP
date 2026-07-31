
/**
 * مكتبة تصدير البيانات إلى صيغ ملفات قياسية
 */
export const exportToCSV = (data: Record<string, unknown>[], fileName: string, headers: string[]) => {
  const replacer = (_key: string, value: unknown) => value === null ? '' : value;
  const csv = [
    headers.join(','), // Header row
    ...data.map(row => 
      Object.values(row).map(value => 
        JSON.stringify(value, replacer).replace(/,/g, '') // Sanitize values
      ).join(',')
    )
  ].join('\r\n');

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
