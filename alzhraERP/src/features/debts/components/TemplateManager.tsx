import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Braces } from 'lucide-react';
import { useDebtTemplates } from '../hooks/useDebtQueries';
import { useDebtMutations } from '../hooks/useDebtMutations';
import { TEMPLATE_PLACEHOLDERS } from '../lib/messageTemplate';
import type { DebtMessageTemplate } from '../types';
import { RowActions, type RowAction } from './RowActions';

export interface TemplateFormState {
  name: string;
  body: string;
  channel: string;
  is_active: boolean;
}

export const EMPTY_TEMPLATE_FORM: TemplateFormState = {
  name: '',
  body: '',
  channel: 'whatsapp',
  is_active: true,
};

const inputClass =
  'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40';

// ── Template editor form (small, self-contained) ──

interface TemplateFormProps {
  editingName: string | null;
  form: TemplateFormState;
  onChange: (next: TemplateFormState) => void;
  onSave: () => void;
  onNew: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({
  editingName,
  form,
  onChange,
  onSave,
  onNew,
}) => {
  const insertPlaceholder = (token: string): void => {
    onChange({ ...form, body: form.body + token });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-[var(--app-text)]">
          {editingName !== null && editingName !== '' ? `تعديل: ${editingName}` : 'قالب جديد'}
        </h4>
        {(editingName === null || editingName === '') && (
          <button
            onClick={() => {
              onNew();
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={12} /> جديد
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={form.name}
          onChange={e => {
            onChange({ ...form, name: e.target.value });
          }}
          placeholder="اسم القالب"
          className={inputClass}
        />
        <select
          value={form.channel}
          onChange={e => {
            onChange({ ...form, channel: e.target.value });
          }}
          className={inputClass}
        >
          <option value="whatsapp">واتساب</option>
          <option value="sms">رسالة نصية</option>
          <option value="email">بريد إلكتروني</option>
          <option value="in_app">داخل التطبيق</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--app-border)] p-2.5">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => {
              onChange({ ...form, is_active: e.target.checked });
            }}
            className="accent-blue-600"
          />
          <span className="text-xs font-bold text-[var(--app-text)]">مفعّل</span>
        </label>
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--app-text-secondary)]">
            <Braces size={11} /> المتغيرات المتاحة:
          </span>
          {TEMPLATE_PLACEHOLDERS.map(ph => (
            <button
              key={ph.token}
              onClick={() => {
                insertPlaceholder(ph.token);
              }}
              title={ph.label}
              className="rounded-lg bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-500 hover:text-white"
            >
              {ph.token}
            </button>
          ))}
        </div>
        <textarea
          value={form.body}
          onChange={e => {
            onChange({ ...form, body: e.target.value });
          }}
          rows={4}
          placeholder={
            'مرحباً {{customer_name}}، لديك رصيد مستحق {{amount}} {{currency}} بتاريخ {{due_date}}.'
          }
          className={`w-full ${inputClass} leading-relaxed`}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            onSave();
          }}
          disabled={!form.name.trim() || !form.body.trim()}
          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          {editingName !== null && editingName !== '' ? 'حفظ التعديل' : 'حفظ القالب'}
        </button>
      </div>
    </div>
  );
};

// ── Template list (small, self-contained) ──

interface TemplateListProps {
  templates: DebtMessageTemplate[];
  onEdit: (t: DebtMessageTemplate) => void;
  onDelete: (id: string) => void;
}

const TemplateList: React.FC<TemplateListProps> = ({ templates, onEdit, onDelete }) => {
  /** إجراءات صف القالب: تعديل مباشر + حذف بتأكيد ConfirmModal (بلا window.confirm). */
  const templateActions = (t: DebtMessageTemplate): RowAction[] => [
    {
      key: 'edit',
      icon: Pencil,
      label: 'تعديل القالب',
      colorClasses: 'bg-sky-500/10 text-sky-600 hover:bg-sky-500 hover:text-white',
      onAction: () => {
        onEdit(t);
      },
    },
    {
      key: 'delete',
      icon: Trash2,
      label: 'حذف القالب',
      colorClasses: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white',
      confirm: {
        title: 'حذف القالب',
        message: 'هل تريد حذف هذا القالب نهائياً؟',
        confirmLabel: 'حذف',
        variant: 'danger',
      },
      onAction: () => {
        onDelete(t.id);
      },
    },
  ];

  return (
    <div className="space-y-2">
      {templates.map(t => (
        <div
          key={t.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 transition-colors hover:bg-[var(--app-surface-hover)]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--app-text)]">{t.name}</span>
              <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
                {t.channel}
              </span>
              {!t.is_active ? (
                <span className="text-[10px] font-bold text-slate-400">معطّل</span>
              ) : null}
            </div>
            <p className="max-w-md truncate text-[10px] text-[var(--app-text-secondary)]">
              {t.body}
            </p>
          </div>
          <RowActions actions={templateActions(t)} variant="table" className="shrink-0" />
        </div>
      ))}
    </div>
  );
};

// ── Manager (composes form + list) ──

const TemplateManager: React.FC = () => {
  const { data: templates, isLoading } = useDebtTemplates(false);
  const { saveTemplate, updateTemplate, deleteTemplate } = useDebtMutations();

  const [editing, setEditing] = useState<DebtMessageTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_TEMPLATE_FORM);

  const handleSave = (): void => {
    if (!form.name.trim() || !form.body.trim()) return;
    if (editing) {
      updateTemplate({ id: editing.id, payload: form });
    } else {
      saveTemplate(form);
    }
    setEditing(null);
    setForm(EMPTY_TEMPLATE_FORM);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--app-text-secondary)]">
        جاري التحميل...
      </div>
    );
  }

  const list = templates ?? [];

  return (
    <div className="space-y-4">
      <TemplateForm
        editingName={editing?.name ?? null}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onNew={() => {
          setEditing(null);
          setForm(EMPTY_TEMPLATE_FORM);
        }}
      />

      {list.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--app-border)] p-10 text-center text-sm text-[var(--app-text-secondary)]">
          لا توجد قوالب — أضف أول قالب للبدء بالتذكير عبر واتساب
        </div>
      ) : (
        <TemplateList
          templates={list}
          onEdit={t => {
            setEditing(t);
            setForm({ name: t.name, body: t.body, channel: t.channel, is_active: t.is_active });
          }}
          onDelete={deleteTemplate}
        />
      )}
    </div>
  );
};

export default TemplateManager;
