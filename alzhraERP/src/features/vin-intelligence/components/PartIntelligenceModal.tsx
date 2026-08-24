import React, { useState } from 'react';
import {
  Sparkles,
  Car,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Plus,
  Info,
  Layers,
  X,
  Gauge,
  ListTree,
} from 'lucide-react';
import Button from '../../../ui/base/Button';
import { cn } from '../../../core/utils';
import { useFeedbackStore } from '../../feedback/store';
import {
  AUTO_PARTS_CATALOGS,
  openCatalogSearch,
} from '../constants/catalogs';
import type {
  PartIntelligenceResult,
  PartAlternative,
  ExcelGridPart,
} from '../types';

interface PartIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  intelligence: PartIntelligenceResult | null;
  isLoading: boolean;
  onAddAlternativeToGrid?: (part: Partial<ExcelGridPart>) => void;
  onAddAllAlternativesToGrid?: (alternatives: PartAlternative[]) => void;
}

export const PartIntelligenceModal: React.FC<PartIntelligenceModalProps> = ({
  isOpen,
  onClose,
  intelligence,
  isLoading,
  onAddAlternativeToGrid,
  onAddAllAlternativesToGrid,
}) => {
  const { showToast } = useFeedbackStore();
  const [copiedPN, setCopiedPN] = useState(false);
  const [activeTab, setActiveTab] = useState<'alternatives' | 'fitment' | 'specs'>('alternatives');

  if (!isOpen) return null;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPN(true);
      showToast('تم نسخ رقم القطعة إلى الحافظة 📋', 'success');
      setTimeout(() => setCopiedPN(false), 2000);
    } catch {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 90) {
      return {
        label: 'ثقة عالية جداً (مؤكد 100%)',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        barBg: 'bg-emerald-500',
      };
    }
    if (score >= 75) {
      return {
        label: 'ثقة جيدة (بديل متطابق)',
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        barBg: 'bg-blue-500',
      };
    }
    return {
      label: 'ثقة متوسطة (بديل محتمل)',
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      barBg: 'bg-amber-500',
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-cairo">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="p-5 bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950 text-white border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles size={22} className="text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md">
                  الذكاء الاصطناعي لاستخراج وتوافق القطع
                </span>
                <span className="text-xs text-slate-400">
                  {intelligence?.manufacturer || 'OEM Catalog'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-base md:text-lg font-bold font-mono text-white">
                  {intelligence?.partNumber || 'جاري الفحص...'}
                </h3>
                {intelligence?.partNumber && (
                  <button
                    type="button"
                    onClick={() => handleCopy(intelligence.partNumber)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="نسخ رقم القطعة"
                  >
                    {copiedPN ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {isLoading || !intelligence ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto animate-spin">
                <Sparkles size={24} />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                جارٍ فحص رقم القطعة واستخراج الأرقام البديلة والسيارات المتوافقة من الكتالوجات العالمية...
              </p>
            </div>
          ) : (
            <>
              {/* ── Bilingual Title & Category Banner ── */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-800/80 dark:to-indigo-950/30 border border-blue-100 dark:border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                    الاسم بالعربية (المتعارف عليه بالسوق):
                  </span>
                  <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                    {intelligence.primaryNameAr}
                  </h4>
                </div>

                <div className="pt-2 border-t border-blue-100/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                    English Technical Name & Specification:
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {intelligence.primaryNameEn}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    📁 {intelligence.categoryAr}
                  </span>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {intelligence.categoryEn}
                  </span>
                </div>
              </div>

              {/* ── Confidence Score Card ── */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Gauge size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        نسبة دقة وتوافق النتيجة:
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-bold px-2 py-0.5 rounded-md border',
                          getConfidenceBadge(intelligence.confidenceScore).bg
                        )}
                      >
                        {intelligence.confidenceScore}% — {getConfidenceBadge(intelligence.confidenceScore).label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {intelligence.confidenceReason}
                    </p>
                  </div>
                </div>

                <div className="w-32 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getConfidenceBadge(intelligence.confidenceScore).barBg)}
                    style={{ width: `${intelligence.confidenceScore}%` }}
                  />
                </div>
              </div>

              {/* ── Quick External Catalogs Bar ── */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe size={14} className="text-blue-500" />
                    فحص مباشر في الكتالوجات العالمية:
                  </span>
                  <span className="text-[10px] text-slate-400">يفتح في لسان جديد</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AUTO_PARTS_CATALOGS.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => openCatalogSearch(cat.id, intelligence.partNumber)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                        cat.colorClass.bg,
                        cat.colorClass.text,
                        cat.colorClass.border,
                        cat.colorClass.hoverBg
                      )}
                      title={`البحث عن ${intelligence.partNumber} في ${cat.nameEn}`}
                    >
                      <span>{cat.badge}</span>
                      <ExternalLink size={11} className="opacity-70" />
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Navigation Tabs: Alternatives vs Fitment vs Specs ── */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('alternatives')}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                    activeTab === 'alternatives'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <ListTree size={14} />
                  <span>الأرقام البديلة و OEM ({intelligence.alternatives.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fitment')}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                    activeTab === 'fitment'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Car size={14} />
                  <span>السيارات الأخرى المتوافقة ({intelligence.compatibleVehicles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                    activeTab === 'specs'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  <Info size={14} />
                  <span>المواصفات التقنية</span>
                </button>
              </div>

              {/* ── Tab Content 1: Alternatives ── */}
              {activeTab === 'alternatives' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      أرقام القطع البديلة المعترف بها (OEM Supersession & Aftermarket Equivalent):
                    </p>
                    {onAddAllAlternativesToGrid && intelligence.alternatives.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onAddAllAlternativesToGrid(intelligence.alternatives)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Layers size={13} />
                        إضافة جميع البدائل المعتمدة (+{intelligence.alternatives.length})
                      </button>
                    )}
                  </div>

                  {intelligence.alternatives.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                      لا توجد أرقام بديلة مسجلة لهذه القطعة حالياً. الرقم الحالي هو الرقم الأصلي المعتمد.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-2.5">الرقم البديل</th>
                            <th className="p-2.5">الصانع / الماركة</th>
                            <th className="p-2.5 text-center">نوع البديل</th>
                            <th className="p-2.5 text-center">نسبة الثقة</th>
                            <th className="p-2.5 text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {intelligence.alternatives.map((alt, idx) => (
                            <tr
                              key={`${alt.partNumber}-${idx}`}
                              className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors"
                            >
                              <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {alt.partNumber}
                              </td>
                              <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                                {alt.brand || 'معتمد'}
                              </td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={cn(
                                    'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                    alt.type === 'OEM'
                                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  )}
                                >
                                  {alt.type === 'OEM' ? 'أصلي OEM' : 'بديل تجاري معتمد'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                                  {alt.confidenceScore}%
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                {onAddAlternativeToGrid && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      onAddAlternativeToGrid({
                                        partNumber: alt.partNumber,
                                        manufacturer: alt.brand || intelligence.manufacturer,
                                        baseName: intelligence.primaryNameAr,
                                        description: `${intelligence.primaryNameAr} (${alt.brand || 'بديل'})`,
                                        source: 'catalog',
                                      });
                                      showToast(`تمت إضافة الرقم البديل ${alt.partNumber} للجدول ✨`, 'success');
                                    }}
                                    className="text-[11px] font-bold py-1 px-2.5 rounded-lg border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50"
                                  >
                                    <Plus size={11} className="ml-1" /> إضافة للجدول
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab Content 2: Compatible Vehicles Fitment ── */}
              {activeTab === 'fitment' && (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                    قائمة السيارات والموديلات الأخرى المتوافقة مع هذه القطعة (Fitment Matrix):
                  </p>

                  {intelligence.compatibleVehicles.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                      لا توجد سيارات إضافية مسجلة. يرجى مراجعة كتالوج الوكالة للتوافق العام.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-2.5">الشركة الصانعة</th>
                            <th className="p-2.5">الموديل / الفئة</th>
                            <th className="p-2.5">سنوات الصنع</th>
                            <th className="p-2.5">المحرك / السعة</th>
                            <th className="p-2.5">ملاحظات التوافق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {intelligence.compatibleVehicles.map((veh, idx) => (
                            <tr
                              key={`${veh.make}-${veh.model}-${idx}`}
                              className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors"
                            >
                              <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">
                                {veh.makeAr} ({veh.make})
                              </td>
                              <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">
                                {veh.modelAr} ({veh.model})
                              </td>
                              <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">
                                {veh.yearRange}
                              </td>
                              <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                {veh.engine || 'جميع المحركات'}
                              </td>
                              <td className="p-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                {veh.notes || 'مطابقة قياسية (Direct Fit)'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab Content 3: Technical Specifications ── */}
              {activeTab === 'specs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(intelligence.specs).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{key}:</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <Button size="sm" variant="outline" onClick={onClose} className="font-bold text-xs rounded-xl">
            إغلاق
          </Button>

          {intelligence && onAddAlternativeToGrid && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onAddAlternativeToGrid({
                    partNumber: intelligence.partNumber,
                    manufacturer: intelligence.manufacturer,
                    baseName: intelligence.primaryNameAr,
                    description: intelligence.primaryNameAr,
                    source: 'catalog',
                  });
                  showToast(`تمت إضافة القطعة ${intelligence.partNumber} للجدول بنجاح ✨`, 'success');
                  onClose();
                }}
                className="bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl shadow-sm"
              >
                <Plus size={14} className="ml-1" />
                إضافة هذه القطعة للجدول
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
