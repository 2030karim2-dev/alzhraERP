import { Calculator, CheckCircle2, LockKeyhole, ShieldAlert } from 'lucide-react';
import type { CommissionPeriod, CommissionPeriodState } from '../types';

type Labels = ReadonlyMap<CommissionPeriodState, string>;

function PeriodStatePills({ states, current, labels }: { states: CommissionPeriodState[]; current: CommissionPeriodState; labels: Labels }): React.JSX.Element {
  return <div className="mt-4 flex flex-wrap gap-2">{states.map(item => <span key={item} className={`rounded-full px-2.5 py-1 text-xs ${item === current ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{labels.get(item) ?? item}</span>)}</div>;
}

function transitionLabel(target: CommissionPeriodState | undefined, labels: Labels, terminal: boolean): string {
  if (terminal) return 'لا انتقال متاح';
  if (target === undefined) return 'الانتقال';
  return `الانتقال إلى ${labels.get(target) ?? target}`;
}

function PeriodActionButtons({ target, labels, protectedTest, terminal, calculating, transitioning, onCalculate, onTransition }: { target?: CommissionPeriodState; labels: Labels; protectedTest: boolean; terminal: boolean; calculating: boolean; transitioning: boolean; onCalculate: () => void; onTransition: () => void }): React.JSX.Element {
  const transitionBlocked = terminal || transitioning || (protectedTest && (target === 'locked' || target === 'paid'));
  const actionLabel = transitionLabel(target, labels, terminal);
  return <>
    <button type="button" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" onClick={onCalculate} disabled={calculating || (!protectedTest && target !== 'calculating')}><Calculator size={16} />{calculating ? 'جارٍ تشغيل المحرك…' : 'تشغيل الحساب الذري'}</button>
    <button type="button" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)] disabled:opacity-50" onClick={onTransition} disabled={transitionBlocked}><LockKeyhole size={16} />{actionLabel}</button>
  </>;
}

interface CommissionPeriodControlsProps {
  selected: CommissionPeriod;
  state: CommissionPeriodState;
  target?: CommissionPeriodState;
  labels: Labels;
  states: CommissionPeriodState[];
  isProtectedTest: boolean;
  isTerminal: boolean;
  isCalculating: boolean;
  isTransitioning: boolean;
  hasError: boolean;
  onCalculate: () => void;
  onTransition: () => void;
}

export function CommissionPeriodControls({ selected, state, target, labels, states, isProtectedTest, isTerminal, isCalculating, isTransitioning, hasError, onCalculate, onTransition }: CommissionPeriodControlsProps): React.JSX.Element {
  return <aside className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm">
    <h2 className="font-semibold text-[var(--app-text)]">التحكم الآمن</h2>
    <p className="mt-2 text-sm text-[var(--app-text-secondary)]">الفترة المحددة: <strong className="text-[var(--app-text)]">{selected.period_label}</strong></p>
    <PeriodStatePills states={states} current={state} labels={labels} />
    <PeriodActionButtons target={target} labels={labels} protectedTest={isProtectedTest} terminal={isTerminal} calculating={isCalculating} transitioning={isTransitioning} onCalculate={onCalculate} onTransition={onTransition} />
    {hasError && <p className="mt-3 text-xs text-red-700">تم رفض العملية بأمان؛ راجع صلاحيتك وحالة الفترة. لم تُحفظ عملية جزئية.</p>}
    {isProtectedTest && <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert size={15} className="mt-0.5 shrink-0" />فترة اختبار: القفل والدفع والنشر النهائي محظورة خادمياً.</p>}
    {state === 'approved' && !isProtectedTest && <p className="mt-3 flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 size={14} /> الفترة جاهزة للقفل وفق الصلاحيات.</p>}
  </aside>;
}
