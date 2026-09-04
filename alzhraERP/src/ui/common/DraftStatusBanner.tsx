import React, { useState } from 'react';
import { Save, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

interface DraftStatusBannerProps {
  itemCount: number;
  onClearDraft: () => void;
  entityName?: string | undefined;
}

const hasValidEntity = (name?: string | undefined): boolean =>
  typeof name === 'string' && name.trim().length > 0;

const DraftBadge: React.FC<{ itemCount: number; entityName?: string | undefined }> = ({
  itemCount,
  entityName,
}) => {
  const hasEntity = hasValidEntity(entityName);

  return (
    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 sm:gap-2">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
        <Save size={12} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold sm:text-xs">
        <span>مسودة محفوظة تلقائياً</span>
        {itemCount > 0 && (
          <span className="rounded-md bg-emerald-200/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
            {itemCount} {itemCount === 1 ? 'صنف' : 'أصناف'}
          </span>
        )}
        {hasEntity && (
          <span className="hidden text-emerald-600/80 dark:text-emerald-400/80 sm:inline">
            • {entityName}
          </span>
        )}
      </div>
    </div>
  );
};

interface ClearActionProps {
  onClear: () => void;
}

const DraftClearAction: React.FC<ClearActionProps> = ({ onClear }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (isConfirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
          تأكيد الإفراغ؟
        </span>
        <button
          type="button"
          onClick={() => {
            setIsConfirming(false);
            onClear();
          }}
          className="flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-rose-700"
        >
          <CheckCircle2 size={11} />
          نعم، إفراغ
        </button>
        <button
          type="button"
          onClick={() => {
            setIsConfirming(false);
          }}
          className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setIsConfirming(true);
      }}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
      title="إفراغ الفاتورة والبدء من جديد"
    >
      <RotateCcw size={11} />
      <Trash2 size={11} />
      <span>إفراغ والبدء من جديد</span>
    </button>
  );
};

export const DraftStatusBanner: React.FC<DraftStatusBannerProps> = ({
  itemCount,
  onClearDraft,
  entityName,
}) => {
  const hasEntity = hasValidEntity(entityName);
  if (itemCount === 0 && !hasEntity) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-2.5 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:px-3 sm:py-2">
      <DraftBadge itemCount={itemCount} entityName={entityName} />
      <DraftClearAction onClear={onClearDraft} />
    </div>
  );
};

export default DraftStatusBanner;
