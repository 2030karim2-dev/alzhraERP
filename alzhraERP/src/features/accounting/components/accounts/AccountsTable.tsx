import React, { useState, useMemo, Fragment } from 'react';
// Fix: Added missing `Scale` icon from lucide-react.
import {
  Layers,
  Plus,
  ShieldCheck,
  Loader2,
  Trash2,
  ChevronRight,
  Lock,
  FileText,
  Scale,
} from 'lucide-react';
// Fix: Corrected import path to point to the barrel file.
import { useAccounts, useAccountMutations } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import AddAccountModal from './AddAccountModal';
import OpeningBalancesModal from './OpeningBalancesModal';
import EmptyState from '../../../../ui/base/EmptyState';
import Button from '../../../../ui/base/Button';
import { cn } from '../../../../core/utils';
// Fix: Corrected import path to point to the barrel file.
import type { Account, AccountFormData } from '../../types/index';
import { useFeedbackStore } from '../../../../features/feedback/store';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';

// ==========================================
// 1. Data Transformation: Flat List to Tree
// ==========================================
/** عقدة شجرة الحسابات (حساب + أبناء). */
interface AccountNode extends Account {
  children: AccountNode[];
}

const buildAccountTree = (accounts: Account[]): AccountNode[] => {
  const map = new Map<string, AccountNode>();
  const roots: AccountNode[] = [];

  accounts.forEach(acc => {
    map.set(acc.id, { ...acc, children: [] });
  });

  accounts.forEach(acc => {
    if (acc.parent_id && map.has(acc.parent_id)) {
      map.get(acc.parent_id)!.children.push(map.get(acc.id)!);
    } else {
      roots.push(map.get(acc.id)!);
    }
  });

  // Function to recursively calculate total balance for parent accounts
  const calculateBalances = (node: AccountNode): number => {
    if (node.children.length === 0) return node.balance;
    node.balance = node.children.reduce(
      (sum: number, child: AccountNode) => sum + calculateBalances(child),
      0
    );
    return node.balance;
  };
  roots.forEach(calculateBalances);

  return roots;
};

// ==========================================
// 2. Recursive Row Rendering Component
// ==========================================
const AccountTreeRow: React.FC<{
  node: AccountNode;
  level: number;
  onToggle: (id: string) => void;
  isExpanded: boolean;
  onDelete: (id: string, isSystem: boolean) => void;
}> = ({ node, level, onToggle, isExpanded, onDelete }) => {
  return (
    <Fragment>
      <tr className="group transition-colors hover:bg-blue-50/20 dark:hover:bg-blue-950/20">
        {/* Account Name & Hierarchy Controls */}
        <td className="border-b border-[var(--app-border)] p-2">
          <div
            className="flex items-center gap-1"
            style={{ paddingInlineStart: `${level * 1.5}rem` }}
          >
            {node.children.length > 0 && (
              <button
                onClick={() => {
                  onToggle(node.id);
                }}
                className="rounded-full p-1 hover:bg-[var(--app-surface-hover)]"
              >
                <ChevronRight
                  size={14}
                  className={cn('transition-transform', isExpanded && 'rotate-90')}
                />
              </button>
            )}
            {node.is_system && <Lock size={12} className="ms-2 text-amber-500/70" />}
            <span className="text-[11px] font-bold text-[var(--app-text)]">{node.name}</span>
          </div>
        </td>
        {/* Code, Type, Balance */}
        <td
          dir="ltr"
          className="border-b border-[var(--app-border)] p-2 font-mono text-[11px] font-bold text-[var(--app-text)]"
        >
          {node.code}
        </td>
        <td className="border-b border-[var(--app-border)] p-2">
          <span className={`border px-2 py-0.5 text-[10px] font-bold ${getTypeColor(node.type)}`}>
            {getTypeLabel(node.type)}
          </span>
        </td>
        <td
          dir="ltr"
          className={`border-b border-[var(--app-border)] p-2 text-start font-mono text-[11px] font-bold ${node.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--app-text)]'}`}
        >
          {formatCurrency(node.balance || 0)}
        </td>
        {/* Actions */}
        <td className="border-b border-[var(--app-border)] p-2 text-center">
          <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
            <button
              className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="عرض كشف الحساب"
            >
              <FileText size={12} />
            </button>
            {!node.is_system && (
              <button
                onClick={() => {
                  onDelete(node.id, node.is_system);
                }}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded &&
        node.children.map((child: AccountNode) => (
          <AccountTreeRow
            key={child.id}
            node={child}
            level={level + 1}
            onToggle={onToggle}
            isExpanded={isExpanded}
            onDelete={onDelete}
          />
        ))}
    </Fragment>
  );
};

// ==========================================
// 3. Main AccountsTable Component
// ==========================================
const AccountsTable: React.FC = () => {
  const { data: accounts, isLoading } = useAccounts();
  const { seedAccounts, isSeeding, deleteAccount, createAccount, isCreating } =
    useAccountMutations();
  const { showToast } = useFeedbackStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; isSystem: boolean } | null>(
    null
  );

  const accountTree = useMemo(() => {
    if (!accounts) return [];
    return buildAccountTree(accounts);
  }, [accounts]);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleAddNew = () => {
    setIsModalOpen(true);
  };

  const handleCreate = (data: AccountFormData) => {
    createAccount(data, {
      onSuccess: () => {
        setIsModalOpen(false);
      },
    });
  };

  const handleDelete = (id: string, isSystem: boolean) => {
    if (isSystem) {
      showToast('لا يمكن حذف حساب نظام', 'warning');
      return;
    }
    setDeleteConfirm({ id, isSystem });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteAccount(
        { id: deleteConfirm.id, isSystem: deleteConfirm.isSystem },
        {
          onSuccess: () => {
            setDeleteConfirm(null);
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="لا توجد حسابات مضافة"
        description="لم يتم إعداد شجرة الحسابات بعد. يمكنك البدء بإضافة حسابات يدوياً أو إنشاء الدليل المحاسبي القياسي الموصى به."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => {
                seedAccounts();
              }}
              disabled={isSeeding}
              variant="success"
              isLoading={isSeeding}
              leftIcon={<ShieldCheck size={16} />}
            >
              إنشاء الدليل القياسي
            </Button>
            <Button onClick={handleAddNew} variant="secondary" leftIcon={<Plus size={16} />}>
              إضافة حساب يدوياً
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="transition-colors duration-300">
      <div className="mb-2 flex justify-end gap-2">
        <Button
          onClick={() => {
            setIsOpeningBalanceModalOpen(true);
          }}
          variant="secondary"
          size="sm"
          leftIcon={<Scale size={12} />}
        >
          أرصدة افتتاحية
        </Button>
        <Button onClick={handleAddNew} variant="primary" size="sm" leftIcon={<Plus size={12} />}>
          حساب جديد
        </Button>
      </div>

      <div className="overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <table className="w-full">
          <thead className="border-b-2 border-[var(--app-border)] bg-[var(--app-surface-hover)]">
            <tr className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
              <th className="p-2.5 text-start">اسم الحساب</th>
              <th className="w-32 p-2.5 text-start">الرمز</th>
              <th className="w-32 p-2.5 text-start">النوع</th>
              <th className="w-48 p-2.5 text-end">الرصيد الإجمالي</th>
              <th className="w-32 p-2.5 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {accountTree.map(node => (
              <AccountTreeRow
                key={node.id}
                node={node}
                level={0}
                onToggle={toggleNode}
                isExpanded={expandedNodes.has(node.id)}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />

      <OpeningBalancesModal
        isOpen={isOpeningBalanceModalOpen}
        onClose={() => {
          setIsOpeningBalanceModalOpen(false);
        }}
      />

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => {
          setDeleteConfirm(null);
        }}
        onConfirm={confirmDelete}
        title="حذف حساب محاسبي"
        message="تنبيه حرج: حذف الحساب سيؤدي لمسح كافة القيود المرتبطة به بشكل نهائي. هل تريد الاستمرار؟"
        variant="danger"
        confirmLabel="نعم، حذف الحساب"
      />
    </div>
  );
};

// ==========================================
// 4. Helper Functions for Styling
// ==========================================
function getTypeLabel(type: string) {
  const map: Record<string, string> = {
    asset: 'أصول',
    liability: 'خصوم',
    equity: 'حقوق ملكية',
    revenue: 'إيرادات',
    expense: 'مصروفات',
  };
  return map[type] || type;
}

function getTypeColor(type: string) {
  switch (type) {
    case 'asset':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900';
    case 'liability':
      return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900';
    case 'equity':
      return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900';
    case 'revenue':
      return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900';
    case 'expense':
      return 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900';
    default:
      return 'bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)]';
  }
}

export default AccountsTable;
