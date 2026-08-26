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
import { AUTO_PARTS_CATALOGS, openCatalogSearch } from '../constants/catalogs';
import type { PartIntelligenceResult, PartAlternative, ExcelGridPart } from '../types';

interface PartIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  intelligence: PartIntelligenceResult | null;
  isLoading: boolean;
  onAddAlternativeToGrid?: (part: Partial<ExcelGridPart>) => void;
  onAddAllAlternativesToGrid?: (alternatives: PartAlternative[]) => void;
}

interface ConfidenceBadge {
  label: string;
  bg: string;
  barBg: string;
}

/* eslint-disable max-lines-per-function, complexity -- React modal composing multiple data tables/tabs; the 50-line / complexity-10 ceilings are not applicable to a component boundary. */
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

  const handleCopy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPN(true);
      showToast('تم نسخ رقم القطعة إلى الحافظة 📋', 'success');
      setTimeout(() => {
        setCopiedPN(false);
      }, 2000);
    } catch {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  };

  const getConfidenceBadge = (score: number): ConfidenceBadge => {
    if (score >= 95) {
      return {
        label: 'مطابقة عالية (OEM موثق)',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        barBg: 'bg-emerald-500',
      };
    }
    if (score >= 90) {
      return {
        label: 'مطابقة عالية (نمط OEM معروف)',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        barBg: 'bg-emerald-500',
      };
    }
    if (score >= 75) {
      return {
        label: 'مطابقة محتملة (تحقق من المقاس)',
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        barBg: 'bg-blue-500',
      };
    }
    return {
      label: 'مطابقة أولية (يُنصح بالتحقق من المصدر)',
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      barBg: 'bg-amber-500',
    };
  };

  return (
    <div className="backdrop-blur-xs animate-in fade-in font-cairo fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 duration-200">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-600/20 p-2.5 text-blue-400">
              <Sparkles size={22} className="animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-blue-400/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  فحص وتوافق القطع (Pattern + Catalog Engine)
                </span>
                <span className="text-xs text-slate-400">
                  {intelligence?.manufacturer ?? 'OEM Catalog'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <h3 className="font-mono text-base font-bold text-white md:text-lg">
                  {intelligence?.partNumber ?? 'جاري الفحص...'}
                </h3>
                {intelligence?.partNumber != null && intelligence.partNumber !== '' && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopy(intelligence.partNumber);
                    }}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    title="نسخ رقم القطعة"
                  >
                    {copiedPN ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body ── */}
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
          {isLoading || !intelligence ? (
            <div className="space-y-3 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 animate-spin items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <Sparkles size={24} />
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                جارٍ فحص رقم القطعة واستخراج الأرقام البديلة والسيارات المتوافقة من الكتالوجات
                العالمية...
              </p>
            </div>
          ) : (
            <>
              {/* ── Bilingual Title & Category Banner ── */}
              <div className="space-y-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-4 dark:border-slate-800 dark:from-slate-800/80 dark:to-indigo-950/30">
                <div>
                  <span className="mb-0.5 block text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    الاسم بالعربية (المتعارف عليه بالسوق):
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white md:text-base">
                    {intelligence.primaryNameAr}
                  </h4>
                </div>

                <div className="border-t border-blue-100/60 pt-2 dark:border-slate-800/60">
                  <span className="mb-0.5 block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    English Technical Name & Specification:
                  </span>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {intelligence.primaryNameEn}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    📁 {intelligence.categoryAr}
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {intelligence.categoryEn}
                  </span>
                </div>
              </div>

              {/* ── Confidence Score Card ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-700/60 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <Gauge size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        نسبة دقة وتوافق النتيجة:
                      </span>
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[11px] font-bold',
                          getConfidenceBadge(intelligence.confidenceScore).bg
                        )}
                      >
                        {intelligence.confidenceScore}% —{' '}
                        {getConfidenceBadge(intelligence.confidenceScore).label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {intelligence.confidenceReason}
                    </p>
                  </div>
                </div>

                <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      getConfidenceBadge(intelligence.confidenceScore).barBg
                    )}
                    style={{ width: `${String(intelligence.confidenceScore)}%` }}
                  />
                </div>
              </div>

              {/* ── Quick External Catalogs Bar ── */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Globe size={14} className="text-blue-500" />
                    فحص مباشر في الكتالوجات العالمية:
                  </span>
                  <span className="text-[10px] text-slate-400">يفتح في لسان جديد</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AUTO_PARTS_CATALOGS.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        openCatalogSearch(cat.id, intelligence.partNumber);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all',
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
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('alternatives');
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                    activeTab === 'alternatives'
                      ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  <ListTree size={14} />
                  <span>الأرقام البديلة و OEM ({intelligence.alternatives.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('fitment');
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                    activeTab === 'fitment'
                      ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  )}
                >
                  <Car size={14} />
                  <span>السيارات الأخرى المتوافقة ({intelligence.compatibleVehicles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('specs');
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                    activeTab === 'specs'
                      ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
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
                        onClick={() => {
                          onAddAllAlternativesToGrid(intelligence.alternatives);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <Layers size={13} />
                        إضافة جميع البدائل المعتمدة (+{intelligence.alternatives.length})
                      </button>
                    )}
                  </div>

                  {intelligence.alternatives.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                      لا توجد أرقام بديلة مسجلة لهذه القطعة حالياً. الرقم الحالي هو الرقم الأصلي
                      المعتمد.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-right text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
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
                              key={`${alt.partNumber}-${String(idx)}`}
                              className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                            >
                              <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {alt.partNumber}
                              </td>
                              <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                                {(alt.brand ?? '') || 'معتمد'}
                              </td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={cn(
                                    'inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold',
                                    alt.type === 'OEM'
                                      ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  )}
                                >
                                  {alt.type === 'OEM' ? 'أصلي OEM' : 'بديل تجاري معتمد'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
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
                                        manufacturer:
                                          (alt.brand ?? '') || intelligence.manufacturer,
                                        baseName: intelligence.primaryNameAr,
                                        description: `${intelligence.primaryNameAr} (${alt.brand ?? 'بديل'})`,
                                        source: 'catalog',
                                      });
                                      showToast(
                                        `تمت إضافة الرقم البديل ${alt.partNumber} للجدول ✨`,
                                        'success'
                                      );
                                    }}
                                    className="rounded-lg border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:border-blue-800"
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
                  <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
                    قائمة السيارات والموديلات الأخرى المتوافقة مع هذه القطعة (Fitment Matrix):
                  </p>

                  {intelligence.compatibleVehicles.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                      لا توجد سيارات إضافية مسجلة. يرجى مراجعة كتالوج الوكالة للتوافق العام.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-right text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
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
                              key={`${veh.make}-${veh.model}-${String(idx)}`}
                              className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
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
                              <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                                {(veh.engine ?? '') || 'جميع المحركات'}
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {(veh.notes ?? '') || 'مطابقة قياسية (Direct Fit)'}
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Object.entries(intelligence.specs).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {key}:
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs font-bold"
          >
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
                  showToast(
                    `تمت إضافة القطعة ${intelligence.partNumber} للجدول بنجاح ✨`,
                    'success'
                  );
                  onClose();
                }}
                className="rounded-xl bg-blue-600 text-xs font-bold shadow-sm hover:bg-blue-700"
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
/* eslint-enable max-lines-per-function, complexity */
