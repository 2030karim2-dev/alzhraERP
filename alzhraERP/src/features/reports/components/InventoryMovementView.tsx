import React, { useState, useMemo } from 'react';
import { useItemMovement, useMinimalProducts } from '../../inventory/hooks/index';
import ExcelTable from '../../../ui/common/ExcelTable';
import { Search, Package, History, ArrowUpRight, ArrowDownRight, ArrowLeftRight, CheckCircle2, Zap, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { cn } from '@/core/utils';

const InventoryMovementView: React.FC = () => {
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Date Filtering State
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');

    const { data: allProducts } = useMinimalProducts();
    const { data: movement, isLoading } = useItemMovement(selectedProductId || null);

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        return allProducts?.filter((p: { name: string; sku: string | null }) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
        ).slice(0, 10) || [];
    }, [allProducts, searchQuery]);

    const selectedProduct = useMemo(() => {
        return allProducts?.find((p: { id: string }) => p.id === selectedProductId);
    }, [allProducts, selectedProductId]);

    const analysis = useMemo(() => {
        const movementArr = (movement as { quantity: number; balance_after: number; entry_date?: string; type?: string; description?: string; unit_cost?: number; id?: string }[]) || [];
        if (!movementArr || movementArr.length === 0) return null;
        const totalIn = movementArr.reduce((sum, m) => sum + (m.quantity > 0 ? m.quantity : 0), 0);
        const totalOut = movementArr.reduce((sum, m) => sum + (m.quantity < 0 ? Math.abs(m.quantity) : 0), 0);
        const startBalance = movementArr[0].balance_after - movementArr[0].quantity;
        const avgStock = (startBalance + movementArr[movementArr.length - 1].balance_after) / 2;

        return {
            currentStock: movementArr[movementArr.length - 1].balance_after,
            totalIn,
            totalOut,
            turnover: avgStock > 0 ? (totalOut / avgStock).toFixed(1) : 0,
            lastMovement: new Date(movementArr[movementArr.length - 1].entry_date || '').toLocaleDateString('ar-SA')
        };
    }, [movement]);

    const chartData = useMemo(() => {
        const movementArr = movement as any[] || [];
        return movementArr.map((m: any) => ({
            date: new Date(m.entry_date).toLocaleDateString('en-GB'),
            balance: m.balance_after
        })).reverse();
    }, [movement]);

    const columns = [
        { header: 'التاريخ المالي', accessor: (row: any) => <span dir="ltr" className="font-mono text-[10px] text-slate-500 font-bold">{new Date(row.entry_date).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}</span> },
        {
            header: 'نوع الحركة', accessor: (row: any) => {
                let icon = <CheckCircle2 size={12} />;
                let color = 'text-slate-500';
                let bg = 'bg-slate-100 dark:bg-slate-800';
                let label = '---';

                if (row.quantity > 0) {
                    icon = <ArrowDownRight size={12} />;
                    color = 'text-emerald-600';
                    bg = 'bg-emerald-500/10 border border-emerald-500/20';
                    label = 'وارد';
                } else {
                    icon = <ArrowUpRight size={12} />;
                    color = 'text-rose-600';
                    bg = 'bg-rose-500/10 border border-rose-500/20';
                    label = 'صادر';
                }

                if (row.reference_type === 'transfer') {
                    icon = <ArrowLeftRight size={12} />;
                    label = row.quantity > 0 ? 'استلام مناقلة' : 'إرسال مناقلة';
                    color = 'text-blue-600';
                    bg = 'bg-blue-500/10 border border-blue-500/20';
                } else if (row.reference_type === 'audit') {
                    icon = <CheckCircle2 size={12} />;
                    label = 'جرد';
                    color = 'text-amber-600';
                    bg = 'bg-amber-500/10 border border-amber-500/20';
                }

                return (
                    <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full w-fit mx-auto", bg, color)}>
                        {icon}
                        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
                    </div>
                );
            }, className: 'text-center'
        },
        {
            header: 'تفاصيل المرجع', accessor: (row: any) => (
                <div className="flex flex-col">
                    <span className="font-bold text-[10px] text-slate-700 dark:text-slate-200">{row.document_number}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{row.source_name}</span>
                </div>
            )
        },
        { header: 'الكمية', accessor: (row: any) => <span dir="ltr" className={cn("font-bold font-mono text-sm px-3 py-1 rounded-xl", row.quantity > 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20')}>{row.quantity > 0 ? '+' : ''}{row.quantity}</span>, className: 'text-center' },
        { header: 'الرصيد التراكمي', accessor: (row: any) => <span dir="ltr" className="font-mono font-bold text-blue-600 ring-1 ring-blue-500/20 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-xl text-sm">{row.balance_after}</span>, className: 'text-center' },
        { header: 'بواسطة', accessor: (row: any) => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.source_user || 'نظام'}</span>, className: 'text-right' },
    ];

    const handleSelectProduct = (product: any) => {
        setSelectedProductId(product.id);
        setSearchQuery(product.name);
        setIsDropdownOpen(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            {/* Command Center: Advanced Search & Control */}
            <div className="glass-panel bento-item p-8 bg-white dark:bg-slate-900/50 border-none shadow-2xl flex flex-col lg:flex-row gap-8 items-end lg:items-center justify-between overflow-visible">
                <div className="relative w-full lg:w-[450px]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">مركز التحكم في المخزون</label>
                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                            onFocus={() => setIsDropdownOpen(true)}
                            placeholder="حدد الصنف لمباشرة التحليل..."
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-[1.5rem] py-4 pl-4 pr-14 text-sm font-bold outline-none transition-all dark:text-slate-100 shadow-inner"
                        />
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 group-focus-within:scale-110 transition-all" size={22} />
                    </div>
                    {isDropdownOpen && filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[100] max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300">
                            {filteredProducts.map((p: any) => (
                                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 group cursor-pointer flex justify-between items-center transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl group-hover:bg-white/20 transition-colors">
                                            <Package size={18} className="text-blue-500 group-hover:text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight">{p.name}</p>
                                            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">{p.sku}</p>
                                        </div>
                                    </div>
                                    <Zap size={14} className="opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-100" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Advanced Chronological Filters */}
                <div className="flex gap-6 w-full lg:w-auto">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">البداية</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-3.5 px-6 text-xs font-black font-mono outline-none focus:border-blue-500 w-full transition-all dark:text-white shadow-inner"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase tracking-widest">النهاية</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl py-3.5 px-6 text-xs font-black font-mono outline-none focus:border-blue-500 w-full transition-all dark:text-white shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {!selectedProductId ? (
                <div className="h-[500px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/20 rounded-[4rem] border-4 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000" />
                    <div className="p-12 bg-blue-500/5 dark:bg-blue-500/10 rounded-[3.5rem] mb-10 relative group overflow-visible">
                        <History size={80} className="text-blue-500 relative z-10 group-hover:rotate-[-10deg] transition-transform duration-700" />
                        <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tighter">تحليل التدفق المخزني</h3>
                    <p className="text-sm font-bold text-slate-400 max-w-md leading-relaxed uppercase tracking-[0.1em]">
                        قم بتحديد صنف من مركز التحكم أعلاه لعرض السجل المالي واللوجستي الكامل، بما في ذلك بيانات التوريد والصرف والمناقلات السحابية.
                    </p>
                </div>
            ) : isLoading ? (
                <div className="h-[500px] flex flex-col justify-center items-center gap-8 bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl">
                    <div className="relative">
                        <div className="w-24 h-24 border-8 border-slate-100 border-t-blue-500 rounded-full animate-spin shadow-2xl shadow-blue-500/20" />
                        <div className="absolute inset-0 flex items-center justify-center font-black text-blue-500 text-[10px]">ERP</div>
                    </div>
                    <div className="text-center space-y-2">
                        <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">جاري تحليل سلسلة التوريد</span>
                        <p className="text-[9px] text-slate-300 font-bold uppercase">ALZHRA SMART LOGISTICS ENGINE</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Insights Bento Column */}
                    <div className="lg:col-span-4 space-y-8 h-full">
                        <div className="glass-panel bento-item p-10 bg-white dark:bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                                <Package size={120} />
                            </div>
                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                                <BarChart3 size={16} /> مُؤشرات الكفاءة
                            </h3>

                            <div className="space-y-8">
                                <div className="group">
                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-400 group-hover:text-blue-500 transition-colors">الرصيد الفعلي الحالي</p>
                                    <div className="flex items-baseline gap-2">
                                        <h2 className="text-6xl font-black font-mono tracking-tighter text-slate-900 dark:text-white">{analysis?.currentStock || 0}</h2>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Qty</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-500">معامل الدوران</p>
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl font-black font-mono text-blue-400 italic">{analysis?.turnover || 0}</span>
                                        <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">Active Flux</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl group hover:bg-emerald-500/20 transition-all">
                                        <ArrowDownRight size={20} className="text-emerald-500 mb-3 group-hover:scale-125 transition-transform" />
                                        <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">تدفق وارد</p>
                                        <p className="text-xl font-black font-mono text-emerald-600 tracking-tighter">+{analysis?.totalIn}</p>
                                    </div>
                                    <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl group hover:bg-rose-500/20 transition-all">
                                        <ArrowUpRight size={20} className="text-rose-500 mb-3 group-hover:scale-125 transition-transform" />
                                        <p className="text-[9px] font-black text-rose-600/60 uppercase tracking-widest mb-1">تدفق صادر</p>
                                        <p className="text-xl font-black font-mono text-rose-600 tracking-tighter">-{analysis?.totalOut}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 pt-8 border-t dark:border-slate-800 flex justify-between items-center opacity-40">
                                <span className="text-[9px] font-black uppercase tracking-widest">Global Status</span>
                                <span className="text-[9px] font-bold font-mono uppercase">SYSLOG_SYNC_OK</span>
                            </div>
                        </div>

                        {/* Chart Preview Card */}
                        <div className="glass-panel bento-item p-10 bg-slate-900 border-none shadow-2xl relative overflow-hidden h-[300px]">
                            <div className="absolute top-0 right-0 p-6">
                                <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest">Live Dynamic Chart</div>
                            </div>
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-12">اتـجـاه الرصـيـد</h4>
                            <div className="h-full w-full">
                                <ResponsiveContainer width="100%" height={200} minWidth={1} minHeight={1}>
                                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="entry_date" hide />
                                        <YAxis hide />
                                        <defs>
                                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="stepAfter"
                                            dataKey="balance"
                                            stroke="#3b82f6"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorBalance)"
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Ledger Table */}
                    <div className="lg:col-span-8">
                        <div className="glass-panel bento-item bg-white dark:bg-slate-900 border-none shadow-2xl overflow-hidden min-h-full">
                            <ExcelTable
                                columns={columns}
                                data={movement || []}
                                colorTheme="blue"
                                title={`سجل العمليات اللوجستية`}
                                subtitle={`تحليل نشاط: ${selectedProduct?.name}`}
                                emptyMessage="لا توجد بيانات متاحة لهذا الصنف في السجل الحالي"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryMovementView;