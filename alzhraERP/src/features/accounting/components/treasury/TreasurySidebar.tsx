
import React, { useMemo, useState, Fragment } from 'react';
import { useAccounts, useAccountMutations } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import { Wallet, Landmark, Plus, Loader2, Globe, ChevronRight } from 'lucide-react';
import { cn } from '../../../../core/utils';
import Button from '../../../../ui/base/Button';
import AddAccountModal from '../accounts/AddAccountModal';

interface Props {
    onSelectAccount: (id: string) => void;
    selectedAccountId: string | null;
}

// Recursive Sidebar Item Component
const SidebarItem: React.FC<{
    node: any;
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
                    "w-full text-right transition-colors flex justify-between items-center group relative",
                    isSelected ? "bg-blue-600 text-white" : "hover:bg-gray-50 dark:hover:bg-slate-800/50",
                    depth === 0 ? "p-3 border-b dark:border-slate-800/50" : "p-2 pr-4"
                )}
                style={{ paddingRight: `${(depth * 12) + 12}px` }}
            >
                <div className="flex items-center gap-2">
                    {hasChildren && (
                        <div
                            className={cn("transition-transform p-0.5 rounded-full hover:bg-black/10", isExpanded && "rotate-90")}
                            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                        >
                            <ChevronRight size={12} />
                        </div>
                    )}

                    {!hasChildren && <div className="w-4" />}

                    <div className={cn("p-1.5 rounded-md", isSelected ? "bg-white/10" : "bg-gray-100 dark:bg-slate-800 text-gray-500")}>
                        {getIcon()}
                    </div>
                    <span className={cn("font-bold tracking-tight", depth === 0 ? "text-[11px] uppercase" : "text-[10px]")}>{node.name}</span>
                </div>

                <div className="text-left pl-2">
                    <span dir="ltr" className={cn("font-mono font-bold", isSelected ? "text-blue-200" : "text-gray-700 dark:text-slate-200", depth === 0 ? "text-sm" : "text-xs")}>
                        {formatCurrency(node.balance)}
                    </span>
                </div>

                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400" />}
            </button>

            {hasChildren && isExpanded && (
                <div className="border-r-2 border-gray-100 dark:border-slate-800 mr-4">
                    {node.children.map((child: any) => (
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
    const { createAccount, isCreating, seedYemeniExchanges, isSeedingExchanges, seedSubCashboxes, isSeedingSubCashboxes, migrateCashboxBalances, isMigratingCashbox } = useAccountMutations();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const treasuryTree = useMemo(() => {
        // We only want Asset accounts starting with 10 for treasury, BUT exclude the root '1000' (Assets) 
        // to make 1010 (Cash), 1020 (Bank), 1030 (Exchange) appear as roots.
        const treasuryAccounts = accounts?.filter(acc => acc.code.startsWith('10') && acc.code !== '1000') || [];

        // Build Map
        const map = new Map<string, any>();
        treasuryAccounts.forEach(acc => map.set(acc.id, { ...acc, children: [] }));

        // Build Tree
        const roots: any[] = [];
        treasuryAccounts.forEach(acc => {
            if (acc.parent_id && map.has(acc.parent_id)) {
                map.get(acc.parent_id).children.push(map.get(acc.id));
            } else {
                // If no parent_id OR parent_id exists but parent is not in our filtered map (e.g. 1000)
                // Treat as Root
                roots.push(map.get(acc.id));
            }
        });

        // Calculate Totals Recursively
        const calculateTotal = (node: any): number => {
            if (node.children.length > 0) {
                const childrenSum = node.children.reduce((sum: number, child: any) => sum + calculateTotal(child), 0);
                node.balance = childrenSum + (Number(node.balance) || 0);
                return node.balance;
            }
            return Number(node.balance) || 0;
        };

        // Sort
        const sortNodes = (nodes: any[]) => {
            nodes.sort((a, b) => parseInt(a.code) - parseInt(b.code));
            nodes.forEach(n => {
                if (n.children.length > 0) sortNodes(n.children);
            });
        };

        roots.forEach(calculateTotal);
        sortNodes(roots);
        return roots;
    }, [accounts]);

    const hasExchangeAccounts = useMemo(() => {
        // Check if root "Exchange Companies" (1030) exists
        return accounts?.some(acc => acc.code === '1030');
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

    const handleCreate = (data: any) => {
        const highestCode = Math.max(0, ...(accounts || []).filter(a => a.code.startsWith('10')).map(a => parseInt(a.code)));
        const newCode = (highestCode + 1).toString();

        createAccount({ ...data, type: 'asset', code: newCode }, {
            onSuccess: () => setIsModalOpen(false)
        });
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm rounded-none h-full flex flex-col">
            <div className="p-4 border-b dark:border-slate-800 bg-slate-900 text-white shrink-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-50">إجمالي السيولة المتاحة</p>
                <h3 dir="ltr" className="text-2xl font-bold font-mono tracking-tighter text-emerald-400">{formatCurrency(totalLiquidity)}</h3>
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

            <div className="p-2 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 space-y-1 shrink-0">
                <Button onClick={() => setIsModalOpen(true)} variant="secondary" size="sm" className="w-full" leftIcon={<Plus size={12} />}>
                    إضافة صندوق / بنك
                </Button>
                {!hasSubCashboxes && (
                    <Button onClick={() => seedSubCashboxes()} isLoading={isSeedingSubCashboxes} variant="outline" size="sm" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-900/40" leftIcon={<Wallet size={12} />}>
                        تقسيم الكاش (عملات متعددة)
                    </Button>
                )}
                {needsMigration && (
                    <Button onClick={() => migrateCashboxBalances()} isLoading={isMigratingCashbox} variant="outline" size="sm" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/40" leftIcon={<Landmark size={12} />}>
                        تسوية رصيد الكاش القديم للسعودي
                    </Button>
                )}
                {!hasExchangeAccounts && (
                    <Button onClick={() => seedYemeniExchanges()} isLoading={isSeedingExchanges} variant="outline" size="sm" className="w-full" leftIcon={<Globe size={12} />}>
                        إضافة حسابات الصرافة اليمنية
                    </Button>
                )}
            </div>

            <AddAccountModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreate}
                isSubmitting={isCreating}
                accounts={accounts}
            />
        </div>
    );
};

export default TreasurySidebar;