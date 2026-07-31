import React from 'react';
import { Factory, Wrench } from 'lucide-react';

interface Article {
    articleId: string;
    articleNo: string;
    articleProductName: string;
    supplierName: string;
    imageUrl?: string;
}

interface Props {
    article: Article;
}

const CompatibilityArticleCard: React.FC<Props> = ({ article }) => {
    return (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl p-5 border border-indigo-100 dark:border-slate-700 shadow-md shadow-indigo-500/5">
            <div className="flex items-center gap-4 flex-wrap">
                {article.imageUrl && (
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shrink-0 shadow-sm">
                        <img src={article.imageUrl} alt={article.articleProductName} className="w-full h-full object-contain rounded-lg" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 rounded-lg">{article.articleNo}</span>
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{article.articleProductName}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><Factory size={14} /> {article.supplierName}</span>
                        <span className="flex items-center gap-1.5"><Wrench size={14} /> ID: {article.articleId}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompatibilityArticleCard;
