import React from 'react';

interface Props {
  preview: any[];
}

const ImportDataPreview: React.FC<Props> = ({ preview }) => {
  if (preview.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        معاينة البيانات (أول 5 صفوف)
      </h4>
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-800">
        <table className="w-full text-[10px]">
          <tbody>
            {preview.map((row, i) => (
              <tr
                key={i}
                className={
                  i === 0
                    ? 'bg-gray-100 font-bold dark:bg-slate-800'
                    : 'border-t dark:border-slate-800'
                }
              >
                {Array.isArray(row) &&
                  row.map((cell: any, j: number) => (
                    <td key={j} className="border-l p-2 first:border-none dark:border-slate-800">
                      {cell}
                    </td>
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
