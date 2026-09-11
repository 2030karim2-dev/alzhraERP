import React, { useMemo, useState, Fragment } from 'react';
import { useAccounts, useAccountMutations } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import { Wallet, Landmark, Loader2, Globe, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '../../../../core/utils';
import Button from '../../../../ui/base/Button';
import AddAccountModal from '../accounts/AddAccountModal';
import { AddTreasuryEntityModal } from './AddTreasuryEntityModal';
import type { Account } from '../../types/models';
import type { AccountFormData } from '../../types';

interface Props {
  onSelectAccount: (id: string) => void;
  selectedAccountId: string | null;
}

/** عقدة شجرة الحسابات (بنية حساب + أبناء). */
interface AccountNode extends Account {
  children: AccountNode[];
}

// Recursive Sidebar Item Component
const SidebarItem: React.FC<{
  node: AccountNode;
  depth?: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}> = ({ node, depth = 0, onSelect, selectedId, expandedIds, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  const getIcon = () => {
    if (hasChildren) return <Globe size={14} />;
    if (node.code.startsWith('101')) return <Wallet size={14} />;
    return <Landmark size={14} />;
  };

  return (
    <Fragment>
      <button
        onClick={e => {
          e.stopPropagation();
          if (hasChildren) {
            onToggle(node.id);
          }
          onSelect(node.id);
        }}
        className={cn(
          'group relative flex w-full items-center justify-between text-start transition-colors',
          isSelected
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
            : 'text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]',
          depth === 0
            ? 'border-b border-[var(--app-border)] p-3 max-md:p-2'
            : 'p-2 ps-4 max-md:p-1.5'
        )}
        style={{ paddingInlineStart: `${depth * 12 + 12}px` }}
      >
        <div className="flex items-center gap-2 max-md:gap-1">
          {hasChildren && (
            <div
              className={cn(
                'rounded-full p-0.5 transition-transform hover:bg-black/10 dark:hover:bg-white/10 max-md:p-0',
                isExpanded && 'rotate-90'
              )}
              onClick={e => {
                e.stopPropagation();
                onToggle(node.id);
              }}
            >
              <ChevronRight size={12} />
            </div>
          )}

          {!hasChildren && <div className="w-4" />}

          <div
            className={cn(
              'rounded-md p-1.5 max-md:p-1',
              isSelected
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)]'
            )}
          >
            {getIcon()}
          </div>
          <span
            className={cn(
              'flex items-center gap-1.5 font-bold tracking-tight',
              depth === 0 ? 'text-[11px] uppercase' : 'text-[10px]'
            )}
          >
            <span>{node.name}</span>
            {node.currency_code && node.currency_code !== 'SAR' && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {node.currency_code}
              </span>
            )}
          </span>
        </div>

        <div className="pe-2 text-start">
          <span
            dir="ltr"
            className={cn(
              'font-mono font-bold',
              isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-[var(--app-text)]',
              depth === 0 ? 'text-sm' : 'text-xs'
            )}
          >
            {formatCurrency(node.balance, node.currency_code)}
          </span>
        </div>

        {isSelected && <div className="absolute bottom-0 end-0 top-0 w-1 bg-blue-500" />}
      </button>

      {hasChildren && isExpanded && (
        <div className="me-4 border-s-2 border-[var(--app-border)]">
          {node.children.map((child: AccountNode) => (
            <SidebarItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </Fragment>
  );
};

const TreasurySidebar: React.FC<Props> = ({ onSelectAccount, selectedAccountId }) => {
  const { data: accounts, isLoading } = useAccounts();
  const { createAccount, isCreating, migrateCashboxBalances, isMigratingCashbox } =
    useAccountMutations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [treasuryModalType, setTreasuryModalType] = useState<'cashbox' | 'exchange' | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Auto-expand all parent categories by default
  React.useEffect(() => {
    if (accounts && accounts.length > 0) {
      setExpandedIds(prev => {
        if (prev.size > 0) return prev;
        const parentIds = new Set(
          accounts.filter(a => accounts.some(c => c.parent_id === a.id)).map(a => a.id)
        );
        return parentIds;
      });
    }
  }, [accounts]);

  const treasuryTree = useMemo(() => {
    // We only want Asset accounts starting with 10 for treasury, BUT exclude the root '1000' (Assets)
    const treasuryAccounts = (
      accounts?.filter(acc => acc.code.startsWith('10') && acc.code !== '1000') || []
    ).sort((a, b) => a.code.localeCompare(b.code));

    // Build Map
    const map = new Map<string, AccountNode>();
    treasuryAccounts.forEach(acc => map.set(acc.id, { ...acc, children: [] }));

    // Build Tree
    const roots: AccountNode[] = [];
    treasuryAccounts.forEach(acc => {
      if (acc.parent_id && map.has(acc.parent_id)) {
        map.get(acc.parent_id)!.children.push(map.get(acc.id)!);
      } else {
        // If no parent_id OR parent_id exists but parent is not in our filtered map (e.g. 1000)
        // Treat as Root
        roots.push(map.get(acc.id)!);
      }
    });

    // Calculate Totals Recursively
    const calculateTotal = (node: AccountNode): number => {
      if (node.children.length > 0) {
        const childrenSum = node.children.reduce(
          (sum: number, child: AccountNode) => sum + calculateTotal(child),
          0
        );
        node.balance = childrenSum + (Number(node.balance) || 0);
        return node.balance;
      }
      return Number(node.balance) || 0;
    };

    // Sort
    const sortNodes = (nodes: AccountNode[]) => {
      nodes.sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10));
      nodes.forEach(n => {
        if (n.children.length > 0) sortNodes(n.children);
      });
    };

    roots.forEach(calculateTotal);
    sortNodes(roots);
    return roots;
  }, [accounts]);

  const hasSubCashboxes = useMemo(() => {
    // Check if sub cashbox (101001) exists
    return accounts?.some(acc => acc.code === '101001');
  }, [accounts]);

  const needsMigration = useMemo(() => {
    // We need migration if the main cashbox (1010) has a non-zero balance BUT it has children (101001)
    const main = accounts?.find(a => a.code === '1010');
    return hasSubCashboxes && main && Number(main.balance) > 0;
  }, [accounts, hasSubCashboxes]);

  const totalLiquidity = useMemo(() => {
    // Sum of all Leaf nodes starting with 10
    const treasuryAccounts =
      accounts?.filter(acc => acc.type === 'asset' && acc.code.startsWith('10')) || [];

    // Helper to find leaves
    const parentIds = new Set(treasuryAccounts.map(a => a.parent_id).filter(Boolean));
    const leaves = treasuryAccounts.filter(a => !parentIds.has(a.id));
    return leaves.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  }, [accounts]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleCreate = (data: AccountFormData) => {
    // Generate the next sibling code under the direct '10xx' level only
    // (never mix 1010, 101001 etc. in the same max() call — that produces wrong codes)
    const directChildren = (accounts || []).filter(a => {
      const numeric = parseInt(a.code, 10);
      return a.code.startsWith('10') && a.code.length <= 4 && !isNaN(numeric);
    });
    const highestCode = Math.max(0, ...directChildren.map(a => parseInt(a.code, 10)));
    const newCode = (highestCode + 1).toString();

    createAccount(
      { ...data, type: 'asset', code: newCode },
      {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      }
    );
  };

  if (isLoading)
    return (
      <div className="p-10 text-center max-md:p-5">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );

  return (
    <div className="flex h-full flex-col border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
      <div className="shrink-0 border-b border-[var(--app-border)] bg-slate-900 p-3 text-white max-md:p-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
          إجمالي السيولة المتاحة
        </p>
        <h3
          dir="ltr"
          className="font-mono text-xl font-bold tracking-tight text-emerald-400 max-md:text-base"
        >
          {formatCurrency(totalLiquidity)}
        </h3>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {treasuryTree.map(node => (
          <SidebarItem
            key={node.id}
            node={node}
            onSelect={onSelectAccount}
            selectedId={selectedAccountId}
            expandedIds={expandedIds}
            onToggle={toggleExpand}
          />
        ))}
      </div>

      <div className="shrink-0 space-y-1 border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] p-2 max-md:p-1.5">
        <div className="grid grid-cols-2 gap-1 max-md:gap-0.5">
          <Button
            onClick={() => {
              setTreasuryModalType('cashbox');
            }}
            variant="secondary"
            size="sm"
            className="w-full"
            leftIcon={<Wallet size={12} />}
          >
            صندوق جديد
          </Button>
          <Button
            onClick={() => {
              setTreasuryModalType('exchange');
            }}
            variant="secondary"
            size="sm"
            className="w-full"
            leftIcon={<Building2 size={12} />}
          >
            شركة صرافة
          </Button>
        </div>
        {needsMigration && (
          <Button
            onClick={() => {
              migrateCashboxBalances();
            }}
            isLoading={isMigratingCashbox}
            variant="outline"
            size="sm"
            className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/40"
            leftIcon={<Landmark size={12} />}
          >
            تسوية رصيد الكاش القديم للسعودي
          </Button>
        )}
      </div>

      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
        accounts={accounts}
      />

      {treasuryModalType && (
        <AddTreasuryEntityModal
          type={treasuryModalType}
          onClose={() => {
            setTreasuryModalType(null);
          }}
        />
      )}
    </div>
  );
};

export default TreasurySidebar;
