import React from 'react';

interface Props {
    preview: any[];
}

const ImportDataPreview: React.FC<Props> = ({ preview }) => {
    if (preview.length === 0) return null;

    return (
        <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">معاينة البيانات (أول 5 صفوف)</h4>
            <div className="overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-lg">
                <table className="w-full text-[9px]">
                    <tbody>
                        {preview.map((row, i) => (
                            <tr key={i} className={i === 0 ? "bg-gray-100 dark:bg-slate-800 font-bold" : "border-t dark:border-slate-800"}>
                                {Array.isArray(row) && row.map((cell: any, j: number) => (
                                    <td key={j} className="p-2 border-l dark:border-slate-800 first:border-none">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ImportDataPreview;
