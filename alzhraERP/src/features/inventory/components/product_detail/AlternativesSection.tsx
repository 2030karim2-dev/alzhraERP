import React, { useState } from 'react';
import { FileText, Link2, Loader2, Globe, CheckCircle, Sparkles, Copy, Check, Plus, ShieldCheck, ShieldAlert, Shield, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '../../../../core/utils';
import { useAIPartLookup } from '../../hooks/useAIPartLookup';
import type { AIAlternative, AISiteDebug } from '../../api/aiPartLookupApi';

interface Props {
    alternatives?: string | null;
    partNumber?: string | null;
    brand?: string | null | undefined;
    productId?: string;
    onAlternativesUpdate?: (newAlternatives: string) => void;
}

const confidenceConfig = {
    high: { icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/15', label: 'موثوق', border: 'border-emerald-200 dark:border-emerald-800' },
    medium: { icon: Shield, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/15', label: 'محتمل', border: 'border-blue-200 dark:border-blue-800' },
    low: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/15', label: 'غير مؤكد', border: 'border-amber-200 dark:border-amber-800' },
};

const methodLabels: Record<string, string> = {
    schema: 'Schema', data: 'Data', xref: 'OEM Ref', cell: 'Table', broad: 'Pattern',
};

const AlternativesSection: React.FC<Props> = ({ alternatives, partNumber, brand, onAlternativesUpdate }) => {
    const { search, searchResult, isSearching, cachedResult } = useAIPartLookup(partNumber);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [addedParts, setAddedParts] = useState<Set<string>>(new Set());

    const existingList = alternatives ? alternatives.split(/[\n,]/).map(s => s.trim()).filter(Boolean) : [];
    const aiAlternatives: AIAlternative[] = searchResult?.alternatives || cachedResult?.alternatives || [];
    const aiSources = searchResult?.source_sites || cachedResult?.source_sites || [];
    const failedSites = searchResult?.failed_sites || [];
    const isCached = searchResult?.cached || cachedResult?.cached || false;
    const debugInfo: AISiteDebug[] = searchResult?.debug || [];

    const newAiAlternatives = aiAlternatives.filter(a => {
        const cleanAI = a.part_number.replace(/[\s-]/g, '').toUpperCase();
        return !existingList.some(e => e.replace(/[\s-]/g, '').toUpperCase() === cleanAI);
    });

    const handleAISearch = async () => {
        if (!partNumber || partNumber.length < 3) return;
        setAddedParts(new Set());
        await search({ partNumber, brand });
    };

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1500);
    };

    const handleAddSingle = (partNum: string) => {
        if (!onAlternativesUpdate) return;
        const unique = [...new Set([...existingList, partNum])];
        onAlternativesUpdate(unique.join(', '));
        setAddedParts(prev => new Set(prev).add(partNum.replace(/[\s-]/g, '').toUpperCase()));
    };

    const handleAddAll = () => {
        if (!onAlternativesUpdate || newAiAlternatives.length === 0) return;
        const unique = [...new Set([...existingList, ...newAiAlternatives.map(a => a.part_number)])];
        onAlternativesUpdate(unique.join(', '));
        setAddedParts(new Set(newAiAlternatives.map(a => a.part_number.replace(/[\s-]/g, '').toUpperCase())));
    };

    const hasResults = aiSources.length > 0 || failedSites.length > 0 || debugInfo.length > 0;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Header */}
            <div className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <FileText size={11} className="text-indigo-500" />
                    <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">أرقام القطع البديلة</h4>
                </div>
                {partNumber && (
                    <button
                        onClick={handleAISearch}
                        disabled={isSearching}
                        className={cn(
                            "flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded transition-all",
                            isSearching
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 cursor-wait animate-pulse"
                                : "bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 dark:from-indigo-900/20 dark:to-blue-900/20 hover:from-indigo-100 hover:to-blue-100 hover:shadow-sm"
                        )}
                    >
                        {isSearching ? (
                            <><Loader2 size={10} className="animate-spin" /> جاري البحث...</>
                        ) : (
                            <><Sparkles size={10} /> بحث ذكي</>
                        )}
                    </button>
                )}
            </div>

            {/* Sites Status Strip */}
            {hasResults && (
                <div className="px-3 py-1 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 flex-wrap">
                        {debugInfo.map(d => (
                            <span
                                key={d.site}
                                className={cn(
                                    "inline-flex items-center gap-0.5 text-[7px] font-bold px-1.5 py-0.5 rounded",
                                    d.ok && d.parts > 0
                                        ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/10"
                                        : d.ok
                                            ? "text-slate-500 bg-slate-100 dark:bg-slate-800"
                                            : "text-red-400 bg-red-50/50 dark:bg-red-900/5 line-through"
                                )}
                                title={`${d.ms}ms`}
                            >
                                {d.ok ? (d.parts > 0 ? <CheckCircle size={7} /> : <Globe size={7} />) : <XCircle size={7} />}
                                {d.site}
                                {d.ok && d.parts > 0 && <span className="font-mono">({d.parts})</span>}
                                <span className="text-[6px] opacity-50">{d.ms < 1000 ? `${d.ms}ms` : `${(d.ms/1000).toFixed(1)}s`}</span>
                            </span>
                        ))}
                        {isCached && <span className="text-[7px] font-bold text-slate-400">⚡ cache</span>}
                    </div>
                    {newAiAlternatives.length > 0 && onAlternativesUpdate && (
                        <button onClick={handleAddAll} className="flex items-center gap-1 text-[8px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded transition-colors shrink-0">
                            <Plus size={8} /> إضافة الكل ({newAiAlternatives.length})
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 p-0 overflow-auto">
                {existingList.length === 0 && aiAlternatives.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10">
                        <Link2 size={18} className="text-slate-200 dark:text-slate-800 mb-2" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">لا توجد أرقام بديلة</span>
                        {partNumber && (
                            <button onClick={handleAISearch} disabled={isSearching}
                                className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1">
                                <Sparkles size={10} />
                                {isSearching ? 'جاري البحث...' : 'بحث بالذكاء الاصطناعي'}
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="text-center px-2 py-1 text-[8px] font-bold text-slate-400 w-7">#</th>
                                <th className="text-right px-2 py-1 text-[8px] font-bold text-slate-400">الرقم</th>
                                <th className="text-right px-2 py-1 text-[8px] font-bold text-slate-400">المصدر</th>
                                <th className="text-right px-2 py-1 text-[8px] font-bold text-slate-400">الثقة</th>
                                <th className="w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                            {existingList.map((alt, i) => (
                                <tr key={`s-${i}`} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                    <td className="px-2 py-1 text-[8px] font-bold text-slate-300 font-mono text-center">{i + 1}</td>
                                    <td className="px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono tracking-wider select-all">{alt}</td>
                                    <td className="px-2 py-1"><span className="text-[7px] font-bold text-emerald-600 flex items-center gap-0.5"><CheckCircle size={7} /> محفوظ</span></td>
                                    <td className="px-2 py-1"><span className="text-[7px] font-bold text-emerald-600">✓</span></td>
                                    <td className="px-1 py-1">
                                        <button onClick={() => handleCopy(alt, i)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition-all">
                                            {copiedIdx === i ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {existingList.length > 0 && newAiAlternatives.length > 0 && (
                                <tr>
                                    <td colSpan={5} className="px-2 py-0.5 bg-indigo-50/50 dark:bg-indigo-900/10">
                                        <span className="text-[7px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                                            <Sparkles size={8} /> نتائج AI — {newAiAlternatives.length} جديد
                                        </span>
                                    </td>
                                </tr>
                            )}

                            {newAiAlternatives.map((alt, i) => {
                                const gi = existingList.length + i;
                                const conf = confidenceConfig[alt.confidence] || confidenceConfig.low;
                                const ConfIcon = conf.icon;
                                const isAdded = addedParts.has(alt.part_number.replace(/[\s-]/g, '').toUpperCase());

                                return (
                                    <tr key={`a-${i}`} className={cn("group transition-colors", isAdded ? "bg-emerald-50/20" : "hover:bg-indigo-50/20")}>
                                        <td className="px-2 py-1 text-[8px] font-bold text-indigo-300 font-mono text-center">{gi + 1}</td>
                                        <td className="px-2 py-1 text-[10px] font-bold text-slate-900 dark:text-white font-mono tracking-wider select-all">{alt.part_number}</td>
                                        <td className="px-2 py-1">
                                            <div className="flex flex-wrap gap-0.5">
                                                {(alt.sources || []).map((src, si) => (
                                                    <span key={si} className="text-[6px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10 px-1 py-0.5 rounded">
                                                        {src}
                                                    </span>
                                                ))}
                                                <span className="text-[6px] font-bold text-slate-400 px-0.5">{methodLabels[alt.method] || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1">
                                            <span className={cn("inline-flex items-center gap-0.5 text-[7px] font-bold px-1 py-0.5 rounded", conf.color, conf.bg)}>
                                                <ConfIcon size={7} /> {conf.label}
                                            </span>
                                        </td>
                                        <td className="px-1 py-1">
                                            {isAdded ? (
                                                <span className="text-[7px] font-bold text-emerald-600 flex items-center gap-0.5"><CheckCircle size={8} /> تمت</span>
                                            ) : (
                                                <div className="flex items-center gap-0.5">
                                                    {onAlternativesUpdate && (
                                                        <button onClick={() => handleAddSingle(alt.part_number)}
                                                            className="text-[7px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 flex items-center gap-0.5">
                                                            <Plus size={8} /> إضافة
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleCopy(alt.part_number, gi)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600">
                                                        {copiedIdx === gi ? <Check size={8} className="text-emerald-500" /> : <Copy size={8} />}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {aiAlternatives.length > 0 && newAiAlternatives.length === 0 && existingList.length > 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-3">
                                        <span className="text-[8px] font-bold text-slate-400 flex items-center justify-center gap-1">
                                            <AlertCircle size={9} /> جميع النتائج مضافة مسبقاً
                                        </span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AlternativesSection;
