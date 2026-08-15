import React from 'react';
import { CheckCircle2, History, Link2, Loader2, ShieldAlert } from 'lucide-react';
import type { PendingInvoice } from '../types';

export function AssignmentNotice(): React.JSX.Element {
  return <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert size={18} className="mt-0.5 shrink-0" /><span>التعيين التاريخي يُحفظ في سجل التدقيق ولا يُحتسب تلقائيًا للفواتير السابقة.</span></div>;
}

export function PendingInvoiceList({ items, selectedId, onSelect, onIgnore, isIgnoring }: { items: PendingInvoice[]; selectedId: string | null; onSelect: (item: PendingInvoice) => void; onIgnore: (id: string) => void; isIgnoring: boolean }): React.JSX.Element {
  return <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm"><div className="border-b border-[var(--app-border)] p-4"><h2 className="font-semibold text-[var(--app-text)]">الفواتير المعلقة</h2><p className="mt-1 text-xs text-[var(--app-text-secondary)]">{items.length} سجلات تحتاج معالجة</p></div><div className="divide-y divide-[var(--app-border)]">{items.map(item => <div key={item.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${selectedId === item.id ? 'bg-emerald-50/50' : ''}`}><div><p className="font-medium text-[var(--app-text)]">فاتورة {item.invoice_id.slice(0, 8)}…</p><p className="mt-1 text-xs text-[var(--app-text-secondary)]">{item.reason ?? 'لا يوجد مهندس مرتبط'} · {new Date(item.detected_at).toLocaleDateString('ar-SA-u-nu-latn')}</p></div><div className="flex gap-2"><button type="button" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => { onSelect(item); }}><Link2 size={14} /> تعيين</button><button type="button" className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-xs text-[var(--app-text-secondary)]" onClick={() => { onIgnore(item.id); }} disabled={isIgnoring}>تجاهل</button></div></div>)}{items.length === 0 && <div className="p-12 text-center text-sm text-[var(--app-text-secondary)]">لا توجد فواتير معلقة حاليًا.</div>}</div></div>;
}

export function AssignmentField({ label, value, onChange, disabled = false, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; placeholder?: string; type?: string }): React.JSX.Element {
  return <label className="block text-xs text-[var(--app-text-secondary)]">{label}<input className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2 text-sm text-[var(--app-text)] disabled:opacity-60" value={value} onChange={event => { onChange(event.target.value); }} disabled={disabled} placeholder={placeholder} type={type} /></label>;
}

export function AssignmentSubmitIcon({ historical, pending }: { historical: boolean; pending: boolean }): React.JSX.Element {
  if (pending) return <Loader2 size={16} className="animate-spin" />;
  return historical ? <History size={16} /> : <CheckCircle2 size={16} />;
}
