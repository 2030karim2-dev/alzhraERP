import React, { useState } from 'react';
import { Car, Box, CalendarDays, Sparkles } from 'lucide-react';
import { useVehicleCompatibility } from '../hooks/useVehicleCompatibility';
import MicroHeader from '../../../ui/base/MicroHeader';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { AIChatInterface } from '../components/AIChatInterface';
import CompatibilitySearchForm from '../components/auto_parts/CompatibilitySearchForm';
import CompatibilityVehicleGrid from '../components/auto_parts/CompatibilityVehicleGrid';
import CompatibilityArticleCard from '../components/auto_parts/CompatibilityArticleCard';

const VehicleCompatibilityPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'catalog' | 'ai'>('catalog');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const { data, isLoading, isError, error: _error } = useVehicleCompatibility(activeSearch);
  const article = data?.article ? { ...data.article, articleId: String(data.article.articleId) } : null;
  const vehicles = data?.vehicles ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setActiveSearch(searchInput.trim());
      setActiveTab('catalog');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-cairo">
      <MicroHeader
        title={t('vehicle_compatibility_search')}
        icon={Car}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8">
        <div className="max-w-none mx-auto space-y-6">
          
          {/* Header & Modes Selection */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Car className="text-indigo-600" /> مستكشف توافق المركبات
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">اختر طريقة البحث المفضلة لديك</p>
            </div>
            
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border dark:border-slate-800">
              <button 
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'catalog' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Box size={16} /> البحث في الفهرس
              </button>
              <button 
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'ai' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Sparkles size={16} className="text-amber-500" /> المساعد الذكي (AI)
              </button>
            </div>
          </div>

          {activeTab === 'catalog' ? (
            <div className="space-y-6">
              <CompatibilitySearchForm 
                searchInput={searchInput} 
                setSearchInput={setSearchInput} 
                handleSearch={handleSearch} 
                isLoading={isLoading} 
              />

              {/* Loading & States for Catalog */}
              {isLoading && (
                <div className="space-y-4 animate-pulse">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl h-24 border border-slate-200 dark:border-slate-800"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl h-40 border border-slate-200 dark:border-slate-800"></div>
                    ))}
                  </div>
                </div>
              )}

              {isError && (
                 <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 text-xs font-bold text-center">
                    حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
                 </div>
              )}

              {/* Empty State (Not Found) */}
              {!isLoading && !isError && vehicles.length === 0 && activeSearch && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-12 text-center max-w-2xl mx-auto shadow-sm">
                  <div className="mx-auto w-20 h-20 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-6">
                    <Car size={40} strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">لا توجد مركبات متوافقة</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    لم نتمكن من العثور على مركبات متوافقة مع رقم القطعة <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 mx-1">{activeSearch}</span>.
                  </p>
                </div>
              )}

              {/* Idle State (No Search Yet) */}
              {!isLoading && !isError && !activeSearch && (
                <div className="flex flex-col items-center justify-center py-10 opacity-70">
                  <div className="w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6 border-8 border-white dark:border-slate-900 shadow-xl shadow-indigo-500/5">
                    <Box size={48} className="text-indigo-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">مستكشف الفهرس المباشر</h3>
                  <p className="text-slate-400 max-w-sm text-center text-sm leading-relaxed">
                    اكتب رقم القطعة أعلاه لاستخراج قائمة كاملة بالمركبات المتوافقة.
                  </p>
                </div>
              )}

              {/* Results Area */}
              {!isLoading && !isError && vehicles.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                  {article && <CompatibilityArticleCard article={article} />}

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">المركبات المتوافقة</h3>
                      <p className="text-sm text-slate-500">تم العثور على {vehicles.length} مركبة</p>
                    </div>
                  </div>

                  <CompatibilityVehicleGrid vehicles={vehicles} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-indigo-100 dark:border-slate-800 mb-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center shrink-0">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">المساعد الذكي (AI)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      يمكنك طرح أسئلة طبيعية للمساعد الذكي. مثلاً: "ابحث لي عن فلاتر لهيونداي إلنترا 2018" أو "ما هي القطع المتوافقة مع تويوتا لاندكروزر 2022؟". وسيقوم المساعد بالبحث والرد عليك بشكل تفصيلي.
                    </p>
                  </div>
                </div>
                
                <AIChatInterface />
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default VehicleCompatibilityPage;
