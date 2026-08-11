import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import MicroHeader from '../../../ui/base/MicroHeader';
import { Car, RotateCcw, Wrench, History, CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { cn } from '../../../core/utils';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import VINSearch from '../components/VINSearch';
import VehicleCard from '../components/VehicleCard';
import DashboardSummary from '../components/DashboardSummary';
import CorePartsTable from '../components/CorePartsTable';
import InventoryMatches from '../components/InventoryMatches';
import MissingParts from '../components/MissingParts';
import DemandIntelligence from '../components/DemandIntelligence';
import VINHistory from '../components/VINHistory';
import VinAIInsights from '../components/VinAIInsights';
import ExplainabilityDrawer from '../components/ExplainabilityDrawer';
import VinTabsBar from '../components/VinTabsBar';
import { useVinTabs, type TabStep } from '../hooks/useVinTabs';
import { useVinHistory } from '../hooks/useVinHistory';
import { useVinAI } from '../hooks/useVinAI';
import { useVinCounts } from '../hooks/useVinCounts';
import type { VehicleCorePart, VinDashboardMetrics, VinAnalysisResult } from '../types';
import { PartSearchPanel } from '../../part-intelligence/components/PartSearchPanel';
import { ShoppingCart, Plus } from 'lucide-react';


// ============================================================
// Analysis Progress (Mobile Optimized)
// ============================================================
const AnalysisProgress: React.FC<{ tabs: TabState[] }> = ({ tabs }) => {
  const { t } = useTranslation();
  
  const getIcon = (status: TabStatus) => {
    switch (status) {
      case 'success': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'error': return <XCircle size={14} className="text-rose-500" />;
      case 'loading': return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      default: return <Circle size={14} className="text-slate-300 dark:text-slate-700" />;
    }
  };

  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 size={16} className="text-blue-500 animate-spin" />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--app-text)]">
          {t('vin_analyzing')}
        </h3>
      </div>
      
      <div className="space-y-3">
        {tabs.map((tab) => (
          <div key={tab.id} className="flex items-center gap-3">
            <div className="shrink-0">{getIcon(tab.status)}</div>
            <div className="flex-1">
              <p className={cn(
                "text-[10px] font-bold transition-colors",
                tab.status === 'loading' ? "text-blue-600 dark:text-blue-400" : 
                tab.status === 'success' ? "text-[var(--app-text)]" :
                tab.status === 'error' ? "text-rose-600" : "text-[var(--app-text-secondary)]"
              )}>
                {tab.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Empty state
// ============================================================
// Empty state receives history from parent to avoid conditional hook calls
const EmptyState: React.FC<{ onSelect: (vin: string) => void; history: ReturnType<typeof useVinHistory>['history'] }> = ({ onSelect, history }) => {
  if (history.length > 0) return <VINHistory history={history} onSelect={onSelect} />;
  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-6 text-center">
      <Car size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-[11px] font-bold text-[var(--app-text-secondary)]">أدخل رقم الشاصي (VIN) للبدء</p>
    </div>
  );
};

// ============================================================
// Tab Content
// ============================================================
interface TabContentProps {
  tab: TabStep;
  data: ReturnType<typeof useVinTabs>['accumulatedData'];
  onPartClick: (part: VehicleCorePart) => void;
  error: string | null;
}

const TabContent: React.FC<TabContentProps> = ({ tab, data, onPartClick, error }) => {
  const { t } = useTranslation();
  const { aiInsight, isAnalyzingAI, aiError, runAIAnalysis } = useVinAI();

  useEffect(() => {
    if (tab === 'inventory' && data.vehicle?.make && data.coreParts.length > 0 && !aiInsight && !isAnalyzingAI) {
      const r: VinAnalysisResult = {
        vin: data.vin, vehicle: data.vehicle, coreParts: data.coreParts,
        inventoryMatches: data.inventoryMatches, missingParts: data.missingParts,
        demandInsights: data.demandInsights, analysisTimestamp: new Date().toISOString(),
        analysisStatus: 'COMPLETE',
      };
      runAIAnalysis(r);
    }
  }, [tab, data, aiInsight, isAnalyzingAI, runAIAnalysis]);

  switch (tab) {
    case 'validate':
      return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600" size={24} />
            </div>
          </div>
          <h3 className="text-[12px] font-black text-[var(--app-text)] mb-1">تم التحقق من رقم الشاصي بنجاح</h3>
          <p className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold">{data.vin}</p>
        </div>
      );

    case 'identify':
      return data.vehicle ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <VehicleCard vehicle={data.vehicle} />
        </div>
      ) : null;

    case 'analyze':
      return (
        <div className="space-y-3">
          <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-purple-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">تحليل المواصفات الفنية</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-text-secondary)]">المحرك</span><span className="font-bold">{data.vehicle?.engineSize || 'N/A'}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-text-secondary)]">السلندرات</span><span className="font-bold">{data.vehicle?.cylinderCount || 'N/A'}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-text-secondary)]">ناقل الحركة</span><span className="font-bold">{data.vehicle?.transmission || 'N/A'}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-text-secondary)]">نظام الدفع</span><span className="font-bold">{data.vehicle?.driveType || 'N/A'}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-text-secondary)]">نوع الهيكل</span><span className="font-bold">{data.vehicle?.bodyType || 'N/A'}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-[var(--app-text-secondary)]">السوق المستهدف</span><span className="font-bold">{data.vehicle?.market || 'N/A'}</span></div>
              </div>
            </div>
          </div>
          <VinAIInsights insight={aiInsight} isLoading={isAnalyzingAI} error={aiError} />
        </div>
      );

    case 'parts':
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={12} className="text-blue-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">القطع الرئيسية المتوافقة ({data.coreParts.length})</h3>
          </div>
          <CorePartsTable parts={data.coreParts} onPartClick={onPartClick} />
        </div>
      );

    case 'oem':
      return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} className="text-blue-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">مطابقة أرقام OEM المرجعية</h3>
          </div>
          <div className="space-y-2">
            {data.coreParts.slice(0, 5).map((part, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-[var(--app-bg)] rounded-lg border border-[var(--app-border)]">
                <span className="text-[10px] font-bold">{part.canonicalPartName}</span>
                <div className="flex gap-1">
                  {part.oemNumbers.slice(0, 2).map((num, j) => (
                    <span key={j} className="text-[8px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-1.5 py-0.5 rounded font-mono">{num}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'knowledge':
      return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Database className="text-purple-600" size={24} />
            </div>
          </div>
          <h3 className="text-[11px] font-black text-[var(--app-text)] mb-1">حالة قاعدة المعرفة</h3>
          <p className="text-[10px] text-[var(--app-text-secondary)]">
            {data.vehicleIsNew ? `تمت إضافة ${data.vehicle?.make || ''} إلى النظام كمركبة جديدة` : `تم تحديث بيانات ${data.vehicle?.make || ''} في قاعدة المعرفة`}
          </p>
        </div>
      );

    case 'inventory':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            <InventoryMatches matches={data.inventoryMatches} />
            <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={14} className="text-rose-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">القطع الناقصة المطلوب شراؤها</h3>
                </div>
                {data.missingParts.length > 0 && (
                  <button className="bg-rose-600 hover:bg-rose-700 text-white text-[8px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-sm active:scale-95 uppercase tracking-tighter">
                    <Plus size={10} /> إضافة الكل للمشتريات
                  </button>
                )}
              </div>
              <MissingParts parts={data.missingParts} />
            </div>
          </div>
          <div className="space-y-3">
            <PartSearchPanel vin={data.vin} vehicleInfo={{ make: data.vehicle?.make || '', model: data.vehicle?.model || '', year: data.vehicle?.year }} />
            <DemandIntelligence insights={data.demandInsights} />
          </div>
        </div>
      );

    default: return null;
  }
};

// ============================================================
// VINPage
// ============================================================
const VINPage: React.FC = () => {
  const { t } = useTranslation();
  const { tabs, activeTab, setActiveTab, accumulatedData: data, runAllSteps, retryStep, reset, isAnyLoading } = useVinTabs();
  const { history, addToHistory } = useVinHistory();
  const { vehicleCount, vinsAnalyzedCount, refreshCounts } = useVinCounts();
  const [selectedPart, setSelectedPart] = useState<VehicleCorePart | null>(null);

  useEffect(() => {
    if (data.vehicle?.make) {
      addToHistory({ vin: data.vin, make: data.vehicle.make, model: data.vehicle.model, year: data.vehicle.year, analyzedAt: new Date().toISOString(), resultSummary: `${data.vehicle.make} ${data.vehicle.model} ${data.vehicle.year || ''} - ${data.coreParts.length} أجزاء` });
      refreshCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.vehicle?.make]);

  const handleAnalyze = useCallback(async (vin: string) => { await runAllSteps(vin); }, [runAllSteps]);
  const handleSelectRecent = useCallback((vin: string) => { handleAnalyze(vin); }, [handleAnalyze]);
  const handlePartClick = useCallback((part: VehicleCorePart) => { setSelectedPart(part); }, []);

  const retryRef = useRef(retryStep);
  retryRef.current = retryStep;

  const handleTabClick = useCallback((idx: number) => {
    const targetTab = tabs[idx];
    if (!targetTab || targetTab.status === 'locked') return;

    // Strict validation: Don't allow going to steps without required data
    if (idx > 0) {
      const prevStep = tabs[idx - 1];
      if (prevStep.status !== 'success') {
         console.warn('[VIN] Cannot jump to tab without previous step success');
         return;
      }
    }

    setActiveTab(idx);
    if (targetTab.status === 'idle') retryRef.current(targetTab.id);
  }, [tabs, setActiveTab]);

  useEffect(() => {
    const ct = tabs[activeTab];
    if (ct?.status === 'success' && activeTab < tabs.length - 1 && tabs[activeTab + 1]?.status === 'idle') {
      setActiveTab(activeTab + 1); retryRef.current(tabs[activeTab + 1].id);
    }
  }, [tabs, activeTab, setActiveTab]);

  const metrics = useMemo((): VinDashboardMetrics => ({
    vinsAnalyzed: vinsAnalyzedCount, vehiclesInKnowledgeBase: vehicleCount,
    verifiedFitments: data.coreParts.filter(p => p.fitmentStatus === 'VERIFIED').length,
    inventoryMatches: data.inventoryMatches.length,
    unknownFitments: data.coreParts.filter(p => p.fitmentStatus === 'UNKNOWN').length,
  }), [vinsAnalyzedCount, vehicleCount, data]);

  const hasData = !!data.vehicle;
  const activeStep = tabs[activeTab]?.id;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950">
      <MicroHeader title={t('vin_intelligence')} subtitle={t('vin_subtitle')} icon={Car}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">Secure Engine Active</span>
            </div>
            <button onClick={reset} className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-500 hover:text-blue-600 transition-all shadow-sm active:scale-95">
              <RotateCcw size={18} />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 space-y-6">
        <DashboardSummary metrics={metrics} />
        
        <div className="max-w-3xl mx-auto w-full">
          <VINSearch onAnalyze={handleAnalyze} isAnalyzing={isAnyLoading} recentVins={history.map(h => h.vin)} onSelectRecent={handleSelectRecent} />
        </div>

        {!hasData && !isAnyLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <EmptyState onSelect={handleSelectRecent} history={history} />
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {isAnyLoading && !hasData && (
            <motion.div 
              key="progress"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-md mx-auto w-full"
            >
              <AnalysisProgress tabs={tabs} />
            </motion.div>
          )}

          {hasData && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <VinTabsBar tabs={tabs} activeTab={activeTab} onTabClick={handleTabClick} />
              
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200/50 dark:border-slate-800/50 rounded-3xl p-4 sm:p-8 shadow-2xl shadow-gray-200/10 dark:shadow-none min-h-[500px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabContent tab={activeStep as TabStep} data={data} onPartClick={handlePartClick} error={tabs[activeTab]?.error || null} />
                    
                    {tabs[activeTab]?.status === 'error' && (
                      <div className="mt-8 flex justify-center">
                        <button 
                          onClick={() => retryStep(activeStep as TabStep)} 
                          className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-rose-500/30 active:scale-95"
                        >
                          <RotateCcw size={16} /> إعادة المحاولة
                        </button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedPart && hasData && (
        <ExplainabilityDrawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} vehicle={data.vehicle!} part={selectedPart} />
      )}
    </div>
  );
};

export default VINPage;
