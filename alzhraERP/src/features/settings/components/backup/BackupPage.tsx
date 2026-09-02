import React from 'react';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CloudSync,
  History,
  HardDrive,
  Zap,
  Info,
  Clock,
  Save,
  CheckCircle2,
  XCircle,
  CloudUpload,
} from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { cn } from '../../../../core/utils';
import { useBackupManager } from '../../hooks/useBackupManager';

const BackupPage: React.FC = () => {
  const { state, actions, refs } = useBackupManager();
  const { isExporting, isExportingToDrive, autoConfig, isSavingConfig, stats, logs } = state;
  const {
    setAutoConfig,
    handleExport,
    handleDriveExport,
    handleImportClick,
    handleFileChange,
    saveConfig,
  } = actions;
  const { fileInputRef } = refs;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'HardDrive':
        return HardDrive;
      case 'CloudSync':
        return CloudSync;
      default:
        return ShieldCheck;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mx-auto max-w-none space-y-6 p-3 pb-24 duration-700 max-md:p-3 md:p-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Header & Core Status Section */}
      <div className="flex flex-col items-stretch gap-4 max-md:gap-4 lg:flex-row">
        {/* Main Status Block */}
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[2.5rem] border border-white/5 bg-slate-950 p-8 text-white shadow-2xl max-md:p-4">
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-4 max-md:gap-4">
              <div className="rounded-2xl border border-blue-500/30 bg-blue-600/20 p-3 text-blue-400 shadow-lg shadow-blue-500/10 max-md:p-3">
                <Database size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tight max-md:text-lg">
                  محرك تأمين البيانات
                </h2>
                <div className="mt-1 flex items-center gap-2 max-md:gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300/60">
                    Neural Backup Engine Active v2.5
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 max-md:gap-4 sm:grid-cols-3">
              <div className="group rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-blue-500/30 max-md:p-4">
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  إجمالي السجلات
                </span>
                <span
                  dir="ltr"
                  className="font-mono text-2xl font-bold leading-none text-blue-400 max-md:text-lg"
                >
                  {stats.totalRecords.toLocaleString('en-US')}
                </span>
              </div>
              <div className="group rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-blue-500/30 max-md:p-4">
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  آخر فحص للنظام
                </span>
                <span
                  dir="ltr"
                  className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-400 max-md:gap-1.5"
                >
                  <CheckCircle2 size={12} /> SECURE
                </span>
              </div>
              <div className="group hidden rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-colors hover:border-blue-500/30 max-md:p-4 sm:block">
                <span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">
                  المساحة المستهلكة
                </span>
                <span dir="ltr" className="mt-1 text-[10px] font-bold uppercase text-white/80">
                  {stats.spaceUsed} / {stats.spaceLimit}
                </span>
              </div>
            </div>
          </div>

          {/* Animated Background Elements */}
          <div className="absolute -bottom-10 -right-10 h-64 w-64 animate-pulse rounded-full bg-blue-600/10 blur-3xl"></div>
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-emerald-600/5 blur-3xl"></div>
        </div>

        {/* Real-time Sync Status Card */}
        <div className="flex flex-col justify-between gap-6 rounded-[2.5rem] border-2 border-gray-100 bg-[var(--app-surface)] p-6 shadow-sm dark:border-slate-800 max-md:gap-3 max-md:p-3 lg:w-80">
          <div>
            <div className="mb-4 flex items-center gap-2 max-md:gap-2">
              <CloudSync size={18} className="animate-spin-slow text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                المزامنة اللحظية
              </span>
            </div>
            <p className="text-[10px] font-bold leading-relaxed text-gray-500 dark:text-slate-400">
              يقوم النظام حالياً بحفظ التغييرات في المستودع المحلي للمتصفح (Local Buffer) بشكل فوري
              لضمان عدم فقدان البيانات.
            </p>
          </div>
          <button className="w-full rounded-2xl border border-blue-100 bg-blue-50 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-600 transition-all hover:bg-blue-600 hover:text-white active:scale-95 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-400">
            إحصائيات المزامنة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-md:gap-3 lg:grid-cols-3">
        {/* Automatic Backup Configuration Section */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 px-2 max-md:gap-2">
            <div className="h-4 w-1.5 rounded-full bg-blue-500"></div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              تكوين النسخ التلقائي (Automation)
            </h3>
          </div>

          <div className="space-y-8 rounded-[2.5rem] border-2 border-gray-100 bg-[var(--app-surface)] p-8 shadow-sm dark:border-slate-800 max-md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 max-md:gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl transition-all',
                    autoConfig.enabled
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-gray-100 text-gray-400 dark:bg-slate-800'
                  )}
                >
                  <Zap size={24} className={autoConfig.enabled ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">
                    تفعيل الجدولة الآلية
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-tight text-gray-400">
                    Automated Backup Scheduler
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={autoConfig.enabled}
                  onChange={e => {
                    setAutoConfig({ ...autoConfig, enabled: e.target.checked });
                  }}
                  className="peer sr-only"
                />
                <div className="peer h-7 w-14 rounded-full bg-gray-200 shadow-inner after:absolute after:start-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-700 dark:bg-slate-800 rtl:peer-checked:after:-translate-x-full"></div>
              </label>
            </div>

            <div
              className={cn(
                'grid grid-cols-1 gap-8 transition-all duration-500 max-md:gap-3 md:grid-cols-2',
                !autoConfig.enabled && 'pointer-events-none opacity-30 grayscale'
              )}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 max-md:gap-2">
                  <Clock size={14} className="text-blue-500" /> دورية النسخ
                </div>
                <div className="flex rounded-2xl border bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-950 max-md:p-1">
                  {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                    <button
                      key={freq}
                      onClick={() => {
                        setAutoConfig({ ...autoConfig, frequency: freq });
                      }}
                      className={cn(
                        'flex-1 rounded-xl py-2 text-[10px] font-bold uppercase transition-all',
                        autoConfig.frequency === freq
                          ? 'border bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-800'
                          : 'text-gray-400 hover:text-gray-600'
                      )}
                    >
                      {freq === 'daily' ? 'يومي' : freq === 'weekly' ? 'أسبوعي' : 'شهري'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 max-md:gap-2">
                  <History size={14} className="text-emerald-500" /> فترة الاستبقاء (أيام)
                </div>
                <div className="flex items-center gap-4 rounded-2xl border bg-gray-50 px-4 py-1.5 dark:border-slate-800 dark:bg-slate-950 max-md:gap-4">
                  <input
                    type="range"
                    min="7"
                    max="365"
                    step="7"
                    value={autoConfig.retentionDays}
                    onChange={e => {
                      setAutoConfig({ ...autoConfig, retentionDays: parseInt(e.target.value) });
                    }}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-slate-800"
                  />
                  <span className="w-8 font-mono text-xs font-bold text-blue-600">
                    {autoConfig.retentionDays}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t pt-4 dark:border-slate-800">
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
          <div className="flex items-center gap-2 px-2 max-md:gap-2">
            <div className="h-4 w-1.5 rounded-full bg-emerald-500"></div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              إجراءات يدوية (Manual)
            </h3>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={isExporting || isExportingToDrive}
              className="group flex w-full items-center gap-5 rounded-[2rem] border-2 border-gray-100 bg-[var(--app-surface)] p-6 text-right shadow-sm transition-all hover:border-emerald-500/30 active:scale-[0.98] dark:border-slate-800 max-md:gap-5 max-md:p-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 dark:border-emerald-900/30 dark:bg-emerald-950/30">
                {isExporting ? <Zap size={24} className="animate-pulse" /> : <Download size={24} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  تنزيل نسخة للملفات
                </h4>
                <p className="mt-1 text-[10px] font-bold uppercase leading-none text-gray-400">
                  Download JSON Archive
                </p>
              </div>
            </button>

            <button
              onClick={handleDriveExport}
              disabled={isExporting || isExportingToDrive}
              className="group flex w-full items-center gap-5 rounded-[2rem] border-2 border-gray-100 bg-[var(--app-surface)] p-6 text-right shadow-sm transition-all hover:border-blue-500/30 active:scale-[0.98] dark:border-slate-800 max-md:gap-5 max-md:p-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 text-blue-600 transition-transform group-hover:scale-110 dark:border-blue-900/30 dark:bg-blue-950/30">
                {isExportingToDrive ? (
                  <CloudSync size={24} className="animate-pulse" />
                ) : (
                  <CloudUpload size={24} />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  رفع إلى Google Drive
                </h4>
                <p className="mt-1 text-[10px] font-bold uppercase leading-none text-gray-400">
                  Upload Directly to Drive
                </p>
              </div>
            </button>

            <button
              onClick={handleImportClick}
              className="group flex w-full items-center gap-5 rounded-[2rem] border-2 border-dashed border-rose-200 bg-[var(--app-surface)] p-6 text-right shadow-sm transition-all hover:bg-rose-50/30 active:scale-[0.98] dark:border-rose-900/30 dark:hover:bg-rose-950/20 max-md:gap-5 max-md:p-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-rose-100 bg-rose-50 text-rose-500 transition-transform group-hover:rotate-12 dark:border-rose-900/30 dark:bg-rose-950/30">
                <Upload size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  استعادة البيانات
                </h4>
                <p className="mt-1 text-[10px] font-bold uppercase leading-none text-gray-400">
                  Restore System from File
                </p>
              </div>
            </button>

            <div className="flex gap-4 rounded-[2rem] border border-rose-100 bg-rose-50 p-5 dark:border-rose-900/30 dark:bg-rose-950/20 max-md:gap-4 max-md:p-5">
              <AlertTriangle size={24} className="mt-0.5 shrink-0 text-rose-500" />
              <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tighter text-rose-800 dark:text-rose-400">
                تحذير: استعادة البيانات ستحل محل كافة السجلات الحالية. تأكد من أنك تملك أحدث نسخة
                احتياطية قبل البدء.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operation Log Footer */}
      <div className="overflow-hidden rounded-[2.5rem] border-2 border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
        <div className="flex items-center justify-between border-b bg-gray-50/80 p-5 px-8 dark:border-slate-800 dark:bg-slate-800/80 max-md:p-5">
          <div className="flex items-center gap-2 max-md:gap-2">
            <History size={16} className="text-gray-400" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-300">
              سجل عمليات الأمن السيبراني
            </h3>
          </div>
          <div className="flex items-center gap-2 max-md:gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              Logger Online
            </span>
          </div>
        </div>
        <div className="flex min-h-[100px] flex-col divide-y dark:divide-slate-800">
          {logs.length > 0 ? (
            logs.map((log: any) => {
              const Icon = getIcon(log.icon);
              return (
                <div
                  key={log.id}
                  className="group flex items-center justify-between p-4 px-8 transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/50 max-md:p-4"
                >
                  <div className="flex items-center gap-5 max-md:gap-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 transition-colors group-hover:text-blue-500 dark:bg-slate-800">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-gray-700 dark:text-slate-200">
                        {log.action}
                      </p>
                      <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                        {log.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 max-md:gap-3">
                    <span dir="ltr" className="font-mono text-[10px] font-bold text-gray-400">
                      {log.size}
                    </span>
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-3 py-1 max-md:gap-2',
                        log.status === 'Success'
                          ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20'
                          : 'border-rose-100 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/20'
                      )}
                    >
                      {log.status === 'Success' ? (
                        <CheckCircle2 size={10} className="text-emerald-500" />
                      ) : (
                        <XCircle size={10} className="text-rose-500" />
                      )}
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-tighter',
                          log.status === 'Success' ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {log.status === 'Success' ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center opacity-40 max-md:p-5">
              <Info size={32} className="mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">لا توجد سجلات حالية</p>
              <p className="mt-1 text-[10px] font-bold uppercase">No Activity Logged Yet</p>
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
