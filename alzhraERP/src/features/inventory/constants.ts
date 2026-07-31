import { 
    Box, 
    Layers, 
    FileSearch, 
    Warehouse, 
    Car, 
    ArrowLeftRight, 
    Archive, 
    TrendingUp, 
    History,
    Activity,
    Sparkles,
    Boxes,
    FileText,
    Settings
} from 'lucide-react';

export interface TabItem {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
}

export interface TabGroup {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    colorClass: string;
    tabs: TabItem[];
}

export const getInventoryTabGroups = (t: (key: string, params?: any) => string): TabGroup[] => [
    {
        id: 'group_inventory',
        label: 'المخزون والمنتجات',
        icon: Boxes,
        colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/30',
        tabs: [
            { id: 'products', label: t('products'), icon: Box },
            { id: 'categories', label: t('categories'), icon: Layers },
        ]
    },
    {
        id: 'group_operations',
        label: 'العمليات والتحركات',
        icon: FileText,
        colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/30',
        tabs: [
            { id: 'transfers', label: t('transfers'), icon: ArrowLeftRight },
            { id: 'audit', label: t('audit'), icon: History },
            { id: 'history', label: t('history'), icon: FileSearch },
        ]
    },

    {
        id: 'group_setup',
        label: 'الإعدادات والتهيئة',
        icon: Settings,
        colorClass: 'text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900/30',
        tabs: [
            { id: 'warehouses', label: t('warehouses'), icon: Warehouse },
            { id: 'vehicles', label: t('common_vehicles'), icon: Car },
        ]
    }
];

export const getInventoryTabs = (t: (key: string, params?: any) => string) => [
    { id: 'products', label: t('products'), icon: Box },
    { id: 'categories', label: t('categories'), icon: Layers },
    { id: 'history', label: t('history'), icon: FileSearch },
    { id: 'warehouses', label: t('warehouses'), icon: Warehouse },
    { id: 'vehicles', label: t('common_vehicles'), icon: Car },
    { id: 'transfers', label: t('transfers'), icon: ArrowLeftRight },
    { id: 'audit', label: t('audit'), icon: History },
];
