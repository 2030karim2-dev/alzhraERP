import React from 'react';
import { Hash, CheckCircle, Car, ExternalLink, Search, Globe, Copy, Check, AlertCircle, Save, Plus, Package, Link2, X, Trash2, Loader2 } from 'lucide-react';
import { EXTERNAL_SITES } from '../constants';
import { useVINLookup } from '../hooks/useVINLookup';
import { PartEntryForm } from './PartEntryForm';

const VINLookupTab: React.FC = () => {
    const { state, actions, queries } = useVINLookup();

    const {
        vinInput, decodedVehicle, savedVehicleId, copied,
        parts, showPartForm, productSearch, linkingPartId,
        savingStates, isValidLength, searchResults
    } = state;

    const {
        setVinInput, setDecodedVehicle, setSavedVehicleId, setShowPartForm,
        setProductSearch, setLinkingPartId, setParts,
        handleVinSearch, handleCopyVin, handleKeyDown,
        addPart, removePart, savePartAsProduct
    } = actions;

    const { isVehicleSaving } = queries;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* VIN Input Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-5 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMjItNGgydjJIMTR2LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                    <div className="relative flex items-center gap-4">
                        <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Hash size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">البحث عبر رقم الهيكل (VIN)</h2>
                            <p className="text-white/70 text-xs mt-0.5">أدخل رقم الهيكل للبحث عن قطع الغيار وحفظ بيانات المركبة تلقائياً</p>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                className="w-full text-center text-xl font-mono font-bold tracking-[0.3em] p-4 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 uppercase transition-all dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-600"
                                placeholder="XXXXXXXXXXXXXXXXX"
                                maxLength={17}
                                value={vinInput}
                                onChange={(e) => { setVinInput(e.target.value.toUpperCase()); setDecodedVehicle(null); setSavedVehicleId(null); }}
                                onKeyDown={handleKeyDown}
                                dir="ltr"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                {vinInput.length > 0 && (
                                    <button onClick={handleCopyVin} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors" title="نسخ">
                                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-gray-400" />}
                                    </button>
                                )}
                            </div>
                            {isValidLength && <div className="absolute right-3 top-1/2 -translate-y-1/2"><CheckCircle size={20} className="text-emerald-500 animate-bounce" /></div>}
                        </div>
                        <button
                            onClick={handleVinSearch}
                            disabled={!isValidLength}
                            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-slate-700 dark:disabled:to-slate-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 disabled:shadow-none transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                        >
                            <Search size={18} /> بحث
                        </button>
                    </div>
                    <div className="flex justify-between mt-2 px-1">
                        <span className={`text-xs font-bold font-mono ${isValidLength ? 'text-emerald-500' : 'text-gray-400'}`}>{vinInput.length}/17</span>
                        {vinInput.length > 0 && !isValidLength && (
                            <span className="flex items-center gap-1 text-xs text-amber-500 font-bold"><AlertCircle size={12} /> يجب أن يكون 17 حرفاً</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Decoded Vehicle + Auto-Save Status */}
            {decodedVehicle && (
                <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 rounded-xl"><Car size={22} className="text-indigo-400" /></div>
                                <div>
                                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{decodedVehicle.make}</h3>
                                    <p className="text-gray-400 text-sm font-bold">{decodedVehicle.country} • {decodedVehicle.year}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${savedVehicleId ? 'bg-emerald-500/20 text-emerald-400' : isVehicleSaving ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                                {isVehicleSaving ? (
                                    <><Loader2 size={14} className="animate-spin" /> جاري الحفظ...</>
                                ) : savedVehicleId ? (
                                    <><CheckCircle size={14} /> تم الحفظ تلقائياً</>
                                ) : (
                                    <><AlertCircle size={14} /> خطأ في الحفظ</>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            {[
                                { label: 'WMI', value: decodedVehicle.wmi, color: 'text-indigo-400' },
                                { label: 'VDS', value: decodedVehicle.vds, color: 'text-emerald-400' },
                                { label: 'VIS', value: decodedVehicle.vis, color: 'text-amber-400' },
                            ].map(seg => (
                                <div key={seg.label} className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{seg.label}</p>
                                    <p className={`text-base font-mono font-bold ${seg.color} mt-0.5`} dir="ltr">{seg.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* External Search Sites */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Globe size={16} className="text-indigo-500" />
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">البحث في المواقع الخارجية</h3>
                            <span className="text-[10px] text-gray-400">— ابحث ثم أضف القطع أدناه</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {EXTERNAL_SITES.map((site) => (
                                <a key={site.id} href={site.searchUrl(vinInput)} target="_blank" rel="noopener noreferrer"
                                    className={`group block ${site.bgColor} border ${site.borderColor} rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-95`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{site.logo}</span>
                                            <div>
                                                <h4 className={`font-bold text-sm ${site.textColor}`}>{site.name}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold">{site.nameAr}</p>
                                            </div>
                                        </div>
                                        <ExternalLink size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <div className={`py-2 px-3 rounded-lg bg-gradient-to-r ${site.color} text-white text-center font-bold text-xs flex items-center justify-center gap-1.5`}>
                                        <Search size={12} /> بحث بالـ VIN
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* لوحة إدخال القطع */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-lg overflow-hidden">
                        <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-indigo-500" />
                                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">القطع المكتشفة</h3>
                                {parts.length > 0 && (
                                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold">{parts.length}</span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowPartForm(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all"
                            >
                                <Plus size={14} /> إضافة قطعة
                            </button>
                        </div>

                        {/* نموذج إضافة قطعة */}
                        {showPartForm && (
                            <PartEntryForm
                                onAdd={addPart}
                                onCancel={() => setShowPartForm(false)}
                                decodedVehicle={decodedVehicle}
                            />
                        )}

                        {/* قائمة القطع المُدخلة */}
                        {parts.length === 0 && !showPartForm ? (
                            <div className="p-8 text-center text-gray-400 dark:text-slate-600">
                                <Package size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-bold">لا توجد قطع مُضافة</p>
                                <p className="text-xs mt-1">ابحث في المواقع أعلاه ثم أضف أرقام القطع هنا</p>
                            </div>
                        ) : (
                            <div className="divide-y dark:divide-slate-800">
                                {parts.map(part => (
                                    <div key={part.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded" dir="ltr">{part.partNumber}</span>
                                                    {part.brand && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{part.brand}</span>}
                                                    <span className="text-[10px] text-gray-400">{part.source}</span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{part.nameAr || part.nameEn}</p>

                                                {/* اختيار الإجراء */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <select
                                                        value={part.action}
                                                        onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, action: e.target.value as any, linkedProductId: undefined, linkedProductName: undefined } as any : p))}
                                                        className="text-[11px] font-bold px-2 py-1 rounded-lg border dark:border-slate-700 dark:bg-slate-800 bg-white"
                                                    >
                                                        <option value="new">➕ إضافة كمنتج جديد</option>
                                                        <option value="cross_ref">🔗 ربط كقطعة بديلة</option>
                                                        <option value="fitment">🚗 ربط بسيارة متوافقة</option>
                                                    </select>

                                                    {(part.action === 'cross_ref' || part.action === 'fitment') && (
                                                        <div className="relative flex-1">
                                                            {part.linkedProductName ? (
                                                                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                                                                    <Link2 size={12} />
                                                                    {part.linkedProductName}
                                                                    <button onClick={() => setParts(prev => prev.map(p => p.id === part.id ? { ...p, linkedProductId: undefined, linkedProductName: undefined } as any : p))} className="mr-1 text-gray-400 hover:text-red-500">
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <input
                                                                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
                                                                        placeholder="ابحث عن المنتج..."
                                                                        value={linkingPartId === part.id ? productSearch : ''}
                                                                        onChange={e => { setLinkingPartId(part.id); setProductSearch(e.target.value); }}
                                                                        onFocus={() => setLinkingPartId(part.id)}
                                                                    />
                                                                    {linkingPartId === part.id && searchResults && searchResults.length > 0 && (
                                                                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                                                                            {searchResults.map((p: any) => (
                                                                                <button
                                                                                    key={p.id}
                                                                                    className="w-full text-right px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-800 text-xs border-b dark:border-slate-800 last:border-0"
                                                                                    onClick={() => {
                                                                                        setParts(prev => prev.map(pt => pt.id === part.id ? { ...pt, linkedProductId: p.id, linkedProductName: p.name_ar || p.name_en } : pt));
                                                                                        setProductSearch('');
                                                                                        setLinkingPartId(null);
                                                                                    }}
                                                                                >
                                                                                    <span className="font-bold">{p.name_ar || p.name_en}</span>
                                                                                    {p.part_number && <span className="text-gray-400 mr-2 font-mono" dir="ltr">{p.part_number}</span>}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 mr-3 shrink-0">
                                                <button
                                                    onClick={() => savePartAsProduct(part)}
                                                    disabled={savingStates[part.id] || ((part.action === 'cross_ref' || part.action === 'fitment') && !part.linkedProductId)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white rounded-lg text-[11px] font-bold transition-all active:scale-95"
                                                >
                                                    {savingStates[part.id] ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                    حفظ
                                                </button>
                                                <button onClick={() => removePart(part.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* زر حفظ الكل */}
                        {parts.length > 1 && (
                            <div className="p-4 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                                <button
                                    onClick={() => parts.forEach(p => savePartAsProduct(p))}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                >
                                    <Save size={16} /> حفظ جميع القطع ({parts.length})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Empty State - Before Search */}
            {!decodedVehicle && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {EXTERNAL_SITES.map((site) => (
                        <div key={site.id} className={`${site.bgColor} border ${site.borderColor} rounded-xl p-4 opacity-50`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{site.logo}</span>
                                <div>
                                    <h4 className={`font-bold text-sm ${site.textColor}`}>{site.name}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold">{site.nameAr}</p>
                                </div>
                            </div>
                            <div className="py-2 px-3 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 text-center font-bold text-xs">
                                أدخل VIN أولاً
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VINLookupTab;
