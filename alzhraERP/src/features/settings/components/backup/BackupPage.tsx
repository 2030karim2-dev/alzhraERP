import React from 'react';
import {
    Database, Download, Upload, ShieldCheck, AlertTriangle,
    CloudSync, History, HardDrive, Zap, Info, Clock,
    Save, CheckCircle2, XCircle, CloudUpload
} from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { cn } from '../../../../core/utils';
import { useBackupManager } from '../../hooks/useBackupManager';

const BackupPage: React.FC = () => {
    const { state, actions, refs } = useBackupManager();
    const { isExporting, isExportingToDrive, autoConfig, isSavingConfig, stats, logs } = state;
    const { setAutoConfig, handleExport, handleDriveExport, handleImportClick, handleFileChange, saveConfig } = actions;
    const { fileInputRef } = refs;

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'HardDrive': return HardDrive;
            case 'CloudSync': return CloudSync;
            default: return ShieldCheck;
        }
    };

    return (
        <div className="p-3 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-none mx-auto space-y-6 pb-24">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />

            {/* Header & Core Status Section */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                {/* Main Status Block */}
                <div className="flex-1 bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/5">
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
                                <Database size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold uppercase tracking-tight">محرك تأمين البيانات</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-[0.2em]">Neural Backup Engine Active v2.5</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                            <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 group hover:border-blue-500/30 transition-colors">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">إجمالي السجلات</span>
                                <span dir="ltr" className="text-2xl font-bold font-mono text-blue-400 leading-none">{stats.totalRecords.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 group hover:border-blue-500/30 transition-colors">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">آخر فحص للنظام</span>
                                <span dir="ltr" className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                                    <CheckCircle2 size={12} /> SECURE
                                </span>
                            </div>
                            <div className="hidden sm:block bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 group hover:border-blue-500/30 transition-colors">
                                <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">المساحة المستهلكة</span>
                                <span dir="ltr" className="text-[10px] font-bold text-white/80 mt-1 uppercase">{stats.spaceUsed} / {stats.spaceLimit}</span>
                            </div>
                        </div>
                    </div>

                    {/* Animated Background Elements */}
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -left-10 -top-10 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl"></div>
                </div>

                {/* Real-time Sync Status Card */}
                <div className="lg:w-80 bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 flex flex-col justify-between gap-6 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <CloudSync size={18} className="text-blue-500 animate-spin-slow" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">المزامنة اللحظية</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 leading-relaxed">
                            يقوم النظام حالياً بحفظ التغييرات في المستودع المحلي للمتصفح (Local Buffer) بشكل فوري لضمان عدم فقدان البيانات.
                        </p>
                    </div>
                    <button className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-blue-100 dark:border-blue-800/50 hover:bg-blue-600 hover:text-white transition-all active:scale-95">
                        إحصائيات المزامنة
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Automatic Backup Configuration Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">تكوين النسخ التلقائي (Automation)</h3>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-gray-100 dark:border-slate-800 p-8 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                    autoConfig.enabled ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                                )}>
                                    <Zap size={24} className={autoConfig.enabled ? "animate-pulse" : ""} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">تفعيل الجدولة الآلية</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Automated Backup Scheduler</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoConfig.enabled}
                                    onChange={(e) => setAutoConfig({ ...autoConfig, enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-gray-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-700 peer-checked:bg-blue-600 shadow-inner"></div>
                            </label>
                        </div>

                        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500", !autoConfig.enabled && "opacity-30 pointer-events-none grayscale")}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest px-1">
                                    <Clock size={14} className="text-blue-500" /> دورية النسخ
                                </div>
                                <div className="flex bg-gray-50 dark:bg-slate-950 p-1 rounded-2xl border dark:border-slate-800">
                                    {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                                        <button
                                            key={freq}
                                            onClick={() => setAutoConfig({ ...autoConfig, frequency: freq })}
                                            className={cn(
                                                "flex-1 py-2 rounded-xl text-[9px] font-bold uppercase transition-all",
                                                autoConfig.frequency === freq
                                                    ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm border dark:border-slate-700"
                                                    : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            {freq === 'daily' ? 'يومي' : freq === 'weekly' ? 'أسبوعي' : 'شهري'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest px-1">
                                    <History size={14} className="text-emerald-500" /> فترة الاستبقاء (أيام)
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-950 px-4 py-1.5 rounded-2xl border dark:border-slate-800">
                                    <input
                                        type="range" min="7" max="365" step="7"
                                        value={autoConfig.retentionDays}
                                        onChange={(e) => setAutoConfig({ ...autoConfig, retentionDays: parseInt(e.target.value) })}
                                        className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <span className="text-xs font-bold font-mono text-blue-600 w-8">{autoConfig.retentionDays}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t dark:border-slate-800">
                            <Button
                                onClick={saveConfig}
                                isLoading={isSavingConfig}
                                className="rounded-2xl px-10 text-[10px] font-bold uppercase tracking-widest shadow-xl"
                                leftIcon={<Save size={16} />}
                            >
                                حفظ الإعدادات
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Quick Manual Actions */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">إجراءات يدوية (Manual)</h3>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleExport}
                            disabled={isExporting || isExportingToDrive}
                            className="w-full group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-slate-800 hover:border-emerald-500/30 transition-all flex items-center gap-5 text-right shadow-sm active:scale-[0.98]"
                        >
                            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 border border-emerald-100 dark:border-emerald-900/30">
                                {isExporting ? <Zap size={24} className="animate-pulse" /> : <Download size={24} />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">تنزيل نسخة للملفات</h4>
                                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase leading-none">Download JSON Archive</p>
                            </div>
                        </button>

                        <button
                            onClick={handleDriveExport}
                            disabled={isExporting || isExportingToDrive}
                            className="w-full group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-slate-800 hover:border-blue-500/30 transition-all flex items-center gap-5 text-right shadow-sm active:scale-[0.98]"
                        >
                            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 border border-blue-100 dark:border-blue-900/30">
                                {isExportingToDrive ? <CloudSync size={24} className="animate-pulse" /> : <CloudUpload size={24} />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">رفع إلى Google Drive</h4>
                                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase leading-none">Upload Directly to Drive</p>
                            </div>
                        </button>

                        <button
                            onClick={handleImportClick}
                            className="w-full group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-dashed border-rose-200 dark:border-rose-900/30 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all flex items-center gap-5 text-right shadow-sm active:scale-[0.98]"
                        >
                            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform shrink-0 border border-rose-100 dark:border-rose-900/30">
                                <Upload size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">استعادة البيانات</h4>
                                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase leading-none">Restore System from File</p>
                            </div>
                        </button>

                        <div className="bg-rose-50 dark:bg-rose-950/20 p-5 rounded-[2rem] border border-rose-100 dark:border-rose-900/30 flex gap-4">
                            <AlertTriangle size={24} className="text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-rose-800 dark:text-rose-400 leading-relaxed uppercase tracking-tighter">
                                تحذير: استعادة البيانات ستحل محل كافة السجلات الحالية. تأكد من أنك تملك أحدث نسخة احتياطية قبل البدء.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operation Log Footer */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 bg-gray-50/80 dark:bg-slate-800/80 border-b dark:border-slate-800 flex justify-between items-center px-8">
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-gray-400" />
                        <h3 className="text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase tracking-widest">سجل عمليات الأمن السيبراني</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Logger Online</span>
                    </div>
                </div>
                <div className="divide-y dark:divide-slate-800 min-h-[100px] flex flex-col">
                    {logs.length > 0 ? logs.map((log: any) => {
                        const Icon = getIcon(log.icon);
                        return (
                            <div key={log.id} className="p-4 px-8 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-700 dark:text-slate-200 uppercase tracking-tight">{log.action}</p>
                                        <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">{log.time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <span dir="ltr" className="text-[10px] font-mono font-bold text-gray-400">{log.size}</span>
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1 rounded-full border",
                                        log.status === 'Success'
                                            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
                                            : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30"
                                    )}>
                                        {log.status === 'Success' ? <CheckCircle2 size={10} className="text-emerald-500" /> : <XCircle size={10} className="text-rose-500" />}
                                        <span className={cn(
                                            "text-[8px] font-bold uppercase tracking-tighter",
                                            log.status === 'Success' ? "text-emerald-600" : "text-rose-600"
                                        )}>{log.status === 'Success' ? 'Success' : 'Failed'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                            <Info size={32} className="mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">لا توجد سجلات حالية</p>
                            <p className="text-[8px] font-bold uppercase mt-1">No Activity Logged Yet</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}</style>
        </div>
    );
};

export default BackupPage;
