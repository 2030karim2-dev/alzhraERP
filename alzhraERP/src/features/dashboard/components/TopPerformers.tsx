import React from 'react';
import { Wrench, Box } from 'lucide-react';
import { cn } from '../../../core/utils';
import { formatCurrency } from '../../../core/utils';

interface TopProduct {
    id: string;
    name: string;
    revenue: number;
    quantity: number;
}

interface TopCustomer {
    id: string;
    name: string;
    total: number;
    invoices: number;
}

interface TopPerformersProps {
    products?: TopProduct[];
    customers?: TopCustomer[];
    className?: string;
}

// --- Sub-components (Atoms/Molecules) ---

const ProductItem = React.memo(({ product, index, maxRevenue }: { product: TopProduct, index: number, maxRevenue: number }) => {
    const percentage = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;

    return (
        <div className="relative flex items-center justify-between p-3 rounded-2xl overflow-hidden group/item cursor-default">
            {/* Progress Bar Background */}
            <div
                className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-amber-500/10 to-transparent transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
            ></div>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>

            <div className="flex items-center gap-3 relative z-10">
                <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-inner backdrop-blur-md border",
                    index === 0 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                        index === 1 ? "bg-slate-700/50 text-slate-300 border-white/10" :
                            "bg-orange-900/20 text-orange-400 border-orange-500/20"
                )}>
                    {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--app-text)] truncate">
                        {product.name}
                    </p>
                    <p className="text-[10px] text-[var(--app-text-secondary)] font-mono mt-0.5">
                        {product.quantity} <span className="font-sans text-[8px]">قطعة مباعة</span>
                    </p>
                </div>
            </div>
            <span className="text-[11px] font-bold text-amber-400 font-mono relative z-10 drop-shadow-md whitespace-nowrap shrink-0 ml-2">
                {formatCurrency(product.revenue)}
            </span>
        </div>
    );
});

const CustomerItem = React.memo(({ customer, index, maxTotal }: { customer: TopCustomer, index: number, maxTotal: number }) => {
    const percentage = maxTotal > 0 ? (customer.total / maxTotal) * 100 : 0;

    return (
        <div className="relative flex items-center justify-between p-3 rounded-2xl overflow-hidden group/item cursor-default">
            {/* Progress Bar Background */}
            <div
                className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-blue-500/10 to-transparent transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
            ></div>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>

            <div className="flex items-center gap-3 relative z-10">
                <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shadow-inner backdrop-blur-md border",
                    index === 0 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        index === 1 ? "bg-slate-700/50 text-slate-300 border-white/10" :
                            "bg-indigo-900/20 text-indigo-400 border-indigo-500/20"
                )}>
                    {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--app-text)] truncate">
                        {customer.name}
                    </p>
                    <p className="text-[10px] text-[var(--app-text-secondary)] font-mono mt-0.5">
                        {customer.invoices} <span className="font-sans text-[8px]">فاتورة/طلبية</span>
                    </p>
                </div>
            </div>
            <span className="text-[11px] font-bold text-blue-400 font-mono relative z-10 drop-shadow-md whitespace-nowrap shrink-0 ml-2">
                {formatCurrency(customer.total)}
            </span>
        </div>
    );
});

const TopPerformers: React.FC<TopPerformersProps> = React.memo(({
    products,
    customers,
    className
}) => {
    const hasProducts = products && products.length > 0;
    const hasCustomers = customers && customers.length > 0;

    const maxProductRevenue = React.useMemo(() =>
        hasProducts ? Math.max(...products.map(p => p.revenue)) : 0,
        [products, hasProducts]);

    const maxCustomerTotal = React.useMemo(() =>
        hasCustomers ? Math.max(...customers.map(c => c.total)) : 0,
        [customers, hasCustomers]);

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
            {/* Top Auto Parts */}
            <div className="bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-5 rounded-3xl relative overflow-hidden group hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] group-hover:bg-amber-400/20 transition-all duration-700 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-xl border border-amber-500/20 shadow-inner">
                        <Box size={18} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--app-text)] tracking-wide">
                            قطع الغيار الأسرع حركة
                        </h3>
                        <p className="text-[10px] font-bold text-[var(--app-text-secondary)]">القطع الأكثر مبيعاً وإيراداً</p>
                    </div>
                </div>

                <div className="space-y-3 relative z-10">
                    {hasProducts ? (
                        products.map((product, index) => (
                            <ProductItem
                                key={product.id}
                                product={product}
                                index={index}
                                maxRevenue={maxProductRevenue}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <Box size={32} className="mx-auto text-[var(--app-text-secondary)] mb-3" />
                            <p className="text-xs font-bold text-[var(--app-text-secondary)]">لا توجد حركات بيع لقطع الغيار</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Customers (Workshops/Individuals) */}
            <div className="bg-[var(--app-surface)]/80 backdrop-blur-xl border border-[var(--app-border)] p-5 rounded-3xl relative overflow-hidden group hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px] group-hover:bg-blue-400/20 transition-all duration-700 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-xl border border-blue-500/20 shadow-inner">
                        <Wrench size={18} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--app-text)] tracking-wide">
                            أفضل العملاء والورش
                        </h3>
                        <p className="text-[10px] font-bold text-[var(--app-text-secondary)]">العملاء ذوي المسحوبات الأعلى</p>
                    </div>
                </div>

                <div className="space-y-3 relative z-10">
                    {hasCustomers ? (
                        customers.map((customer, index) => (
                            <CustomerItem
                                key={customer.id}
                                customer={customer}
                                index={index}
                                maxTotal={maxCustomerTotal}
                            />
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <Wrench size={32} className="mx-auto text-[var(--app-text-secondary)] mb-3" />
                            <p className="text-xs font-bold text-[var(--app-text-secondary)]">لا توجد بيانات عملاء</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default TopPerformers;
