
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
                onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildren) {
                        onToggle(node.id);
                    }
                    onSelect(node.id);
                }}
                className={cn(
                    "w-full text-start transition-colors flex justify-between items-center group relative",
                    isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "hover:bg-[var(--app-surface-hover)] text-[var(--app-text)]",
                    depth === 0 ? "p-3 max-md:p-2 border-b border-[var(--app-border)]" : "p-2 max-md:p-1.5 ps-4"
                )}
                style={{ paddingInlineStart: `${(depth * 12) + 12}px` }}
            >
                <div className="flex items-center gap-2 max-md:gap-1">
                    {hasChildren && (
                        <div
                            className={cn("transition-transform p-0.5 max-md:p-0 rounded-full hover:bg-black/10 dark:hover:bg-white/10", isExpanded && "rotate-90")}
                            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                        >
                            <ChevronRight size={12} />
                        </div>
                    )}

                    {!hasChildren && <div className="w-4" />}

                    <div className={cn("p-1.5 max-md:p-1 rounded-md", isSelected ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "bg-[var(--app-surface-hover)] text-[var(--app-text-secondary)]")}>
                        {getIcon()}
                    </div>
                    <span className={cn("font-bold tracking-tight", depth === 0 ? "text-[11px] uppercase" : "text-[10px]")}>{node.name}</span>
                </div>

                <div className="text-start pe-2">
                    <span dir="ltr" className={cn("font-mono font-bold", isSelected ? "text-blue-700 dark:text-blue-300" : "text-[var(--app-text)]", depth === 0 ? "text-sm" : "text-xs")}>
                        {formatCurrency(node.balance)}
                    </span>
                </div>

                {isSelected && <div className="absolute end-0 top-0 bottom-0 w-1 bg-blue-500" />}
            </button>

            {hasChildren && isExpanded && (
                <div className="border-s-2 border-[var(--app-border)] me-4">
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
    const { createAccount, isCreating, migrateCashboxBalances, isMigratingCashbox } = useAccountMutations();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [treasuryModalType, setTreasuryModalType] = useState<'cashbox' | 'exchange' | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());


    const treasuryTree = useMemo(() => {
        // We only want Asset accounts starting with 10 for treasury, BUT exclude the root '1000' (Assets) 
        const treasuryAccounts = (accounts?.filter(acc => acc.code.startsWith('10') && acc.code !== '1000') || [])
            .sort((a, b) => a.code.localeCompare(b.code));

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
                const childrenSum = node.children.reduce((sum: number, child: AccountNode) => sum + calculateTotal(child), 0);
                node.balance = childrenSum + (Number(node.balance) || 0);
                return node.balance;
            }
            return Number(node.balance) || 0;
        };

        // Sort
        const sortNodes = (nodes: AccountNode[]) => {
            nodes.sort((a, b) => parseInt(a.code) - parseInt(b.code));
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
        const treasuryAccounts = accounts?.filter(acc => acc.type === 'asset' && acc.code.startsWith('10')) || [];

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
        const highestCode = Math.max(0, ...(accounts || []).filter(a => a.code.startsWith('10')).map(a => parseInt(a.code)));
        const newCode = (highestCode + 1).toString();

        createAccount({ ...data, type: 'asset', code: newCode }, {
            onSuccess: () => { setIsModalOpen(false); }
        });
    };

    if (isLoading) return <div className="p-10 max-md:p-5 text-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] shadow-sm h-full flex flex-col">
            <div className="p-3 max-md:p-2 border-b border-[var(--app-border)] bg-slate-900 text-white shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">إجمالي السيولة المتاحة</p>
                <h3 dir="ltr" className="text-xl max-md:text-base font-bold font-mono tracking-tight text-emerald-400">{formatCurrency(totalLiquidity)}</h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
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

            <div className="p-2 max-md:p-1.5 border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] space-y-1 shrink-0">
                <div className="grid grid-cols-2 gap-1 max-md:gap-0.5">
                    <Button
                        onClick={() => { setTreasuryModalType('cashbox'); }}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        leftIcon={<Wallet size={12} />}
                    >
                        صندوق جديد
                    </Button>
                    <Button
                        onClick={() => { setTreasuryModalType('exchange'); }}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        leftIcon={<Building2 size={12} />}
                    >
                        شركة صرافة
                    </Button>
                </div>
                {needsMigration && (
                    <Button onClick={() => { migrateCashboxBalances(); }} isLoading={isMigratingCashbox} variant="outline" size="sm" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/40" leftIcon={<Landmark size={12} />}>
                        تسوية رصيد الكاش القديم للسعودي
                    </Button>
                )}
            </div>

            <AddAccountModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); }}
                onSubmit={handleCreate}
                isSubmitting={isCreating}
                accounts={accounts}
            />

            {treasuryModalType && (
                <AddTreasuryEntityModal
                    type={treasuryModalType}
                    onClose={() => { setTreasuryModalType(null); }}
                />
            )}
        </div>
    );
};

export default TreasurySidebar;