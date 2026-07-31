import React from 'react';

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-block bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 px-2 py-0.5 rounded-md font-mono text-xs mx-1">
        {children}
    </span>
);

const Instructions: React.FC = () => {
  return (
    <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 p-4 rounded-lg text-sm">
        <h3 className="font-bold mb-2 text-gray-800 dark:text-slate-200">تعليمات استخدام الجدول التفاعلي:</h3>
        <ul className="list-disc pr-5 space-y-2 text-gray-600 dark:text-slate-400 text-xs font-medium">
            <li>انقر على أي خلية لبدء التحرير مباشرة.</li>
            <li>استخدم <Key>↑</Key> <Key>↓</Key> <Key>←</Key> <Key>→</Key> للتنقل بين الخلايا.</li>
            <li>اضغط <Key>Enter</Key> للانتقال إلى الخلية في الصف التالي.</li>
            <li>اضغط <Key>Tab</Key> في آخر خلية لإضافة صف جديد تلقائياً.</li>
        </ul>
    </div>
  );
};

export default Instructions;
