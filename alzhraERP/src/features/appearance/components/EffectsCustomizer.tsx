
import React from 'react';
import { Maximize, Minimize, Sparkles, Droplet } from 'lucide-react';
import { useThemeStore } from '../../../lib/themeStore';

const EffectsCustomizer: React.FC = () => {
  const {
    draftSettings, setDraftRadius, setDraftShadowStrength,
    setDraftGlassBlur, setDraftGlassOpacity
  } = useThemeStore();
  const { radius, shadowStrength, glassBlur, glassOpacity } = draftSettings;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm animate-in fade-in duration-500">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">استدارة الحواف (Border Radius)</h3>
          <div className="flex items-center gap-4">
            <Minimize size={16} className="text-gray-400" />
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={radius}
              onChange={(e) => setDraftRadius(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <Maximize size={16} className="text-gray-400" />
          </div>
          <div className="text-center mt-3 text-xs font-mono text-gray-500">{radius}rem</div>

          <div className="mt-6 flex gap-4 justify-center items-end">
            <div style={{ borderRadius: `${radius}rem` }} className="w-20 h-20 bg-blue-500 shadow-lg transition-all"></div>
            <div style={{ borderRadius: `${radius}rem` }} className="w-16 h-16 bg-emerald-500 shadow-lg transition-all"></div>
            <div style={{ borderRadius: `${radius}rem` }} className="w-12 h-12 bg-rose-500 shadow-lg transition-all"></div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">كثافة الظل (Shadow Intensity)</h3>
          <div className="flex items-center gap-4">
            <Droplet size={16} className="text-gray-400 opacity-20" />
            <input
              type="range"
              min="0"
              max="0.25"
              step="0.01"
              value={shadowStrength}
              onChange={(e) => setDraftShadowStrength(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <Droplet size={16} className="text-gray-400" />
          </div>
          <div className="text-center mt-3 text-xs font-mono text-gray-500">{shadowStrength.toFixed(2)}</div>

          <div className="mt-6 flex gap-4 justify-center items-end">
            <div style={{ borderRadius: `${radius}rem`, boxShadow: `0 ${shadowStrength * 100}px ${shadowStrength * 200}px rgba(0,0,0,${shadowStrength})` }} className="w-20 h-20 bg-white dark:bg-slate-800 transition-all"></div>
            <div style={{ borderRadius: `${radius}rem`, boxShadow: `0 ${shadowStrength * 100}px ${shadowStrength * 200}px rgba(0,0,0,${shadowStrength})` }} className="w-16 h-16 bg-white dark:bg-slate-800 transition-all"></div>
            <div style={{ borderRadius: `${radius}rem`, boxShadow: `0 ${shadowStrength * 100}px ${shadowStrength * 200}px rgba(0,0,0,${shadowStrength})` }} className="w-12 h-12 bg-white dark:bg-slate-800 transition-all"></div>
          </div>
        </div>

        {/* Glassmorphism Controls */}
        <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">قوة البلور (Glass Blur)</h3>
          <div className="flex items-center gap-4">
            <Droplet size={14} className="text-gray-400 opacity-40 shrink-0" />
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={glassBlur}
              onChange={(e) => setDraftGlassBlur(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <Droplet size={14} className="text-blue-500 shrink-0" />
          </div>
          <div className="text-center mt-3 text-xs font-mono text-gray-500">{glassBlur}px</div>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-slate-800">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">شفافية الزجاج (Glass Opacity)</h3>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-gray-400 shrink-0">5%</span>
            <input
              type="range"
              min="0.05"
              max="0.6"
              step="0.01"
              value={glassOpacity}
              onChange={(e) => setDraftGlassOpacity(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[10px] font-bold text-gray-400 shrink-0">60%</span>
          </div>
          <div className="text-center mt-3 text-xs font-mono text-gray-500">{(glassOpacity * 100).toFixed(0)}%</div>
        </div>

        {/* Glass Preview */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">معاينة التأثير الزجاجي (Live Preview)</h3>
          <div className="relative h-48 rounded-[2rem] overflow-hidden flex items-center justify-center bg-slate-900 group">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 opacity-80 scale-110 group-hover:scale-100 transition-transform duration-700"></div>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre-big.png')]"></div>

            {/* Glass Card Preview */}
            <div
              style={{
                backdropFilter: `blur(${glassBlur}px)`,
                WebkitBackdropFilter: `blur(${glassBlur}px)`,
                backgroundColor: `rgba(255, 255, 255, ${glassOpacity})`,
                borderRadius: `${radius}rem`,
                boxShadow: `0 8px 32px 0 rgba(0, 0, 0, ${shadowStrength * 5})`,
                border: `1px solid rgba(255, 255, 255, ${glassOpacity + 0.1})`
              }}
              className="w-72 h-36 flex flex-col items-center justify-center p-6 text-center z-10 transition-all duration-300 transform group-hover:scale-105"
            >
              <div className="p-3 bg-white/20 rounded-2xl mb-3 backdrop-blur-md">
                <Sparkles className="text-white drop-shadow-lg" size={24} />
              </div>
              <p className="text-white font-black text-sm drop-shadow-md">باقة الزجاج الاحترافية</p>
              <p className="text-white/80 text-[9px] font-bold uppercase tracking-widest mt-2 px-3 py-1 bg-black/20 rounded-full">
                Alzhra Dynamic Glass
              </p>
            </div>

            {/* Animated blobs for movement detection */}
            <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-400 rounded-full blur-3xl opacity-40 animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-rose-400 rounded-full blur-3xl opacity-40 animate-pulse delay-700"></div>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-100 dark:border-slate-800 space-y-4">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">تأثيرات إضافية</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
            <Sparkles size={16} className="text-amber-500" />
            <div>
              <p className="text-[10px] font-bold text-gray-700 dark:text-slate-200">نمط الحركة الذكي</p>
              <p className="text-[8px] text-gray-400 font-bold uppercase">Soft UI Animations</p>
            </div>
            <div className="ms-auto">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full text-[8px] font-bold uppercase">مفعل</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectsCustomizer;
