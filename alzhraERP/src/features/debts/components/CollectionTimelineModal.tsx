/**
 * CollectionTimelineModal — Phase 2A: خط زمني لأنشطة تحصيل الطرف
 * مع نموذج تسجيل نشاط جديد وإجراء تالٍ مجدول.
 *
 * قيود الجودة المطبّقة هنا (مسار صفر أخطاء):
 * - لا شروط على قيم nullable — فحوص صريحة (!== null / !== '').
 * - تعقيد كل دالة ≤ 10 وطولها ≤ 50 سطراً (تقسيم إلى مكوّنات صغيرة).
 * - صراحة أنواع الإرجاع على كل دالة سهمية مُسمّاة.
 */
import React, { useState } from 'react';
import { History, Loader2, Send, Phone, MessageSquare, MapPin, Mail, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePartyTimeline } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { escalationBadgeMeta } from '../lib/constants';
import type { FollowUpDashboardRow, PartyTimelineEntry } from '../types';
import { DebtsModalShell } from './DebtsModalShell';

interface CollectionTimelineModalProps {
  /** يُركَّب من الجدول فقط عند اختيار صف — وهميته مطلوبة للواجهة. */
  isOpen: boolean;
  onClose: () => void;
  row: FollowUpDashboardRow;
  /** صلاحية debts:manage لتسجيل أنشطة تحصيل جديدة. */
  canManage?: boolean;
}

/** قيم نموذج تسجيل النشاط (نصوص خام — التطبيع عند الإرسال). */
interface ActivityValues {
  activityType: string;
  subject: string;
  notes: string;
  outcome: string;
  nextActionDate: string;
  priority: string;
}

/** معاملات تسجيل النشاط — مطابقة لتوقيع logCollectionActivity في useDebtMutations. */
interface LogActivityParams {
  partyId: string;
  activityType: string;
  subject: string;
  outcome: string | null;
  notes: string | null;
  nextActionDate: string | null;
  priority: string;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60';

const FieldLabel: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({
  htmlFor,
  children,
}) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500"
  >
    {children}
  </label>
);

const ACTIVITY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'call', label: 'اتصال هاتفي' },
  { value: 'whatsapp', label: 'رسالة واتساب' },
  { value: 'visit', label: 'زيارة ميدانية' },
  { value: 'email', label: 'بريد إلكتروني' },
  { value: 'other', label: 'نشاط آخر' },
];

const PRIORITY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'low', label: 'منخفضة' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'high', label: 'عالية' },
];

const emptyValues = (): ActivityValues => ({
  activityType: 'call',
  subject: '',
  notes: '',
  outcome: '',
  nextActionDate: '',
  priority: 'medium',
});

/** أيقونة/لون/تسمية نوع النشاط — switch صريح بلا اشتراطات nullable. */
const activityVisual = (type: string): { icon: LucideIcon; label: string; cls: string } => {
  switch (type) {
    case 'call':
      return { icon: Phone, label: 'اتصال', cls: 'bg-blue-500/10 text-blue-600' };
    case 'whatsapp':
      return {
        icon: MessageSquare,
        label: 'واتساب',
        cls: 'bg-emerald-500/10 text-emerald-600',
      };
    case 'visit':
      return { icon: MapPin, label: 'زيارة', cls: 'bg-amber-500/10 text-amber-600' };
    case 'email':
      return { icon: Mail, label: 'بريد', cls: 'bg-violet-500/10 text-violet-600' };
    default:
      return {
        icon: Info,
        label: type !== '' ? type : 'نشاط',
        cls: 'bg-slate-500/10 text-slate-600',
      };
  }
};

/** فئة لون ختم الحالة — لكل الحالات المعروفة، وافتراضي محايد. */
const statusClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-600';
    case 'pending':
      return 'bg-amber-500/10 text-amber-600';
    case 'overdue':
      return 'bg-rose-500/10 text-rose-600';
    default:
      return 'bg-slate-500/10 text-slate-600';
  }
};

/**
 * تسمية عربية لحالة النشاط — تمنع عرض قيم enum الإنجليزية
 * (completed/pending/...) في واجهة عربية. switch بدل فهرسة كائن.
 */
const statusLabel = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'مكتمل';
    case 'cancelled':
      return 'ملغى';
    case 'pending':
      return 'قيد الانتظار';
    case 'overdue':
      return 'متأخر';
    default:
      return status;
  }
};

/** تسمية عربية لأولوية النشاط (low/medium/high). */
const priorityLabel = (priority: string): string => {
  switch (priority) {
    case 'low':
      return 'منخفضة';
    case 'medium':
      return 'متوسطة';
    case 'high':
      return 'عالية';
    default:
      return priority;
  }
};

/** نص آمن: null أو فارغ → البديل المطلوب. */
const orFallback = (value: string | null, fallback: string): string =>
  value !== null && value !== '' ? value : fallback;

/** طابع زمني محلي (بلا انزياح UTC) — للعرض فقط. */
const formatStamp = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/** تطبيع قيم النموذج إلى معاملات log_collection_activity. */
const toParams = (partyId: string, values: ActivityValues): LogActivityParams => ({
  partyId,
  activityType: values.activityType,
  subject: values.subject.trim(),
  outcome: values.outcome.trim() !== '' ? values.outcome.trim() : null,
  notes: values.notes.trim() !== '' ? values.notes.trim() : null,
  nextActionDate: values.nextActionDate !== '' ? values.nextActionDate : null,
  priority: values.priority,
});

/** عنصر واحد في الخط الزمني — كل الشروط nullable صريحة عبر orFallback. */
const TimelineEntryItem: React.FC<{ entry: PartyTimelineEntry }> = ({ entry }) => {
  const visual = activityVisual(entry.activity_type);
  const Icon = visual.icon;
  const creator = orFallback(entry.creator_name, '—');
  const prioritySuffix =
    entry.priority !== 'low' ? ` · أولوية ${priorityLabel(entry.priority)}` : '';
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${visual.cls}`}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[var(--app-text)]">{visual.label}</span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${statusClass(entry.status)}`}
          >
            {statusLabel(entry.status)}
          </span>
          <span className="text-[10px] text-[var(--app-text-secondary)]">
            {formatStamp(entry.created_at)}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-[var(--app-text)]">
          {orFallback(entry.subject, 'بدون عنوان')}
        </p>
        {orFallback(entry.description, '') !== '' && (
          <p className="mt-0.5 text-[11px] text-[var(--app-text-secondary)]">{entry.description}</p>
        )}
        {orFallback(entry.outcome, '') !== '' && (
          <p className="mt-0.5 text-[11px] font-semibold text-amber-600">
            النتيجة: {entry.outcome}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-[var(--app-text-secondary)]">
          {creator}
          {prioritySuffix}
        </p>
      </div>
    </li>
  );
};

/** قائمة الخط الزمني — حالات تحميل/فراغ منفصلة عن العرض. */
const TimelineList: React.FC<{
  loading: boolean;
  entries: PartyTimelineEntry[];
}> = ({ loading, entries }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-xs text-[var(--app-text-secondary)]">
        <Loader2 size={14} className="animate-spin" />
        جارٍ تحميل الخط الزمني…
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--app-text-secondary)]">
        لا توجد أنشطة تحصيل مسجلة بعد.
      </p>
    );
  }
  return (
    <ol className="mb-3 max-h-72 overflow-y-auto pe-1">
      {entries.map(entry => (
        <TimelineEntryItem key={entry.id} entry={entry} />
      ))}
    </ol>
  );
};

const TextField: React.FC<{
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  inputType?: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, placeholder, inputType = 'text', onChange }) => (
  <div>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <input
      id={id}
      type={inputType}
      className={inputClass}
      value={value}
      placeholder={placeholder}
      onChange={event => {
        onChange(event.target.value);
      }}
    />
  </div>
);

const TextAreaField: React.FC<{
  id: string;
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, rows, placeholder, onChange }) => (
  <div>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <textarea
      id={id}
      rows={rows}
      className={inputClass}
      value={value}
      placeholder={placeholder}
      onChange={event => {
        onChange(event.target.value);
      }}
    />
  </div>
);

const SelectField: React.FC<{
  id: string;
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ id, label, value, options, onChange }) => (
  <div>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <select
      id={id}
      className={inputClass}
      value={value}
      onChange={event => {
        onChange(event.target.value);
      }}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

/** صف النوع + الأولوية (منفصل لخفض تعقيد النموذج). */
const TypePriorityRow: React.FC<{
  activity: string;
  priority: string;
  onActivity: (value: string) => void;
  onPriority: (value: string) => void;
}> = ({ activity, priority, onActivity, onPriority }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <SelectField
      id="ctm-activity"
      label="نوع النشاط"
      value={activity}
      options={ACTIVITY_OPTIONS}
      onChange={onActivity}
    />
    <SelectField
      id="ctm-priority"
      label="الأولوية"
      value={priority}
      options={PRIORITY_OPTIONS}
      onChange={onPriority}
    />
  </div>
);

/** حقول الموضوع/الملاحظات/النتيجة/تاريخ الإجراء التالي. */
const SubjectFields: React.FC<{
  values: ActivityValues;
  onChange: (key: keyof ActivityValues, value: string) => void;
}> = ({ values, onChange }) => (
  <>
    <TextField
      id="ctm-subject"
      label="الموضوع *"
      value={values.subject}
      placeholder="ملخص التواصل مع العميل"
      onChange={value => {
        onChange('subject', value);
      }}
    />
    <TextAreaField
      id="ctm-notes"
      label="ملاحظات"
      rows={2}
      value={values.notes}
      placeholder="تفاصيل المحادثة والاتفاقات"
      onChange={value => {
        onChange('notes', value);
      }}
    />
    <TextField
      id="ctm-outcome"
      label="النتيجة"
      value={values.outcome}
      placeholder="مثال: وعد بالسداد خلال 3 أيام"
      onChange={value => {
        onChange('outcome', value);
      }}
    />
    <TextField
      id="ctm-next"
      label="تاريخ الإجراء التالي"
      inputType="date"
      value={values.nextActionDate}
      onChange={value => {
        onChange('nextActionDate', value);
      }}
    />
  </>
);

/** نموذج تسجيل نشاط تحصيل — حالته محلية ويتجمّع/يُفكّ مع المودال. */
const ActivityForm: React.FC<{
  isSaving: boolean;
  onSubmit: (values: ActivityValues) => void;
}> = ({ isSaving, onSubmit }) => {
  const [values, setValues] = useState<ActivityValues>(emptyValues);
  const canSubmit = !isSaving && values.subject.trim() !== '';
  const setField = (key: keyof ActivityValues, value: string): void => {
    setValues(previous => ({ ...previous, [key]: value }));
  };
  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-[var(--app-border)] pt-3">
      <TypePriorityRow
        activity={values.activityType}
        priority={values.priority}
        onActivity={value => {
          setField('activityType', value);
        }}
        onPriority={value => {
          setField('priority', value);
        }}
      />
      <SubjectFields values={values} onChange={setField} />
      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {isSaving ? 'جارٍ الحفظ…' : 'تسجيل النشاط وجدولة الإجراء'}
      </button>
    </form>
  );
};

/**
 * المودال: خط زمني لأنشطة التحصيل + نموذج تسجيل نشاط — يُركَّب من جدول
 * المتابعة عند اختيار صف ({timelineRow}) فيُصفّر حالته مع كل فتحة.
 */
const CollectionTimelineModal: React.FC<CollectionTimelineModalProps> = ({
  isOpen,
  onClose,
  row,
  canManage = true,
}) => {
  const { logCollectionActivity, isSaving } = useDebtMutations();
  const timeline = usePartyTimeline(isOpen ? row.party_id : null);

  const handleSave = (values: ActivityValues): void => {
    logCollectionActivity(toParams(row.party_id, values));
  };

  return (
    <DebtsModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={<History size={20} />}
      iconClassName="bg-gradient-to-tr from-slate-600 to-slate-500 shadow-slate-500/20"
      title={`خط تحصيل — ${row.party_name}`}
      titleExtra={
        <span
          className={`mt-1 inline-block rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${
            escalationBadgeMeta(row.escalation_stage).badgeClass
          }`}
        >
          تصعيد: {escalationBadgeMeta(row.escalation_stage).label}
        </span>
      }
      size="lg"
      bodyClassName="p-4 space-y-3"
    >
      <TimelineList loading={timeline.isPending} entries={timeline.data ?? []} />

      {canManage ? (
        <ActivityForm isSaving={isSaving} onSubmit={handleSave} />
      ) : (
        <p className="border-t border-[var(--app-border)] pt-3 text-[11px] text-[var(--app-text-secondary)]">
          لا تملك صلاحية تسجيل أنشطة التحصيل (الصلاحية المطلوبة: debts:manage).
        </p>
      )}
    </DebtsModalShell>
  );
};

export default CollectionTimelineModal;
