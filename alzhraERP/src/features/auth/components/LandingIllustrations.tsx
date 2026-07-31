import React from 'react';
import { motion } from 'framer-motion';

// ─── Dashboard Mockup SVG ──────────────────────────────────────────
export const DashboardMockup: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`relative ${className}`}>
        <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 15 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative"
            style={{ perspective: '1000px' }}
        >
            {/* Browser Frame */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-blue-900/20
        dark:shadow-black/40 border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Title Bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-900 border-b
          border-gray-200 dark:border-slate-700">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4">
                        <div className="bg-gray-200 dark:bg-slate-700 rounded-md h-5 max-w-xs mx-auto
              flex items-center justify-center text-[8px] text-gray-400 dark:text-slate-500">
                            alzahra-erp.app
                        </div>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="p-4 space-y-4" dir="rtl">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'المبيعات اليوم', value: '٤,٢٥٠', color: 'bg-blue-500', change: '+12%' },
                            { label: 'قطع المخزون', value: '١٥,٨٣٢', color: 'bg-emerald-500', change: '+5%' },
                            { label: 'الفواتير', value: '٣٤٧', color: 'bg-orange-500', change: '+8%' },
                            { label: 'العملاء', value: '٢,١٤٥', color: 'bg-purple-500', change: '+3%' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700"
                            >
                                <div className={`w-6 h-6 ${stat.color} rounded-lg mb-2 opacity-80`} />
                                <div className="text-[10px] text-gray-400 dark:text-slate-500">{stat.label}</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-white">{stat.value}</div>
                                <div className="text-[9px] text-emerald-500 font-bold">{stat.change}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Chart Area */}
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                        <div className="text-[10px] font-bold text-gray-600 dark:text-slate-400 mb-3">المبيعات الشهرية</div>
                        <div className="flex items-end gap-1 h-20">
                            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    whileInView={{ height: `${h}%` }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
                                    className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-400 opacity-80"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Table Preview */}
                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                        <div className="text-[10px] font-bold text-gray-600 dark:text-slate-400 mb-2">آخر الفواتير</div>
                        {[1, 2, 3].map((row) => (
                            <div key={row} className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
                                <div className="w-6 h-4 bg-gray-200 dark:bg-slate-700 rounded" />
                                <div className="flex-1 h-3 bg-gray-200 dark:bg-slate-700 rounded" />
                                <div className="w-12 h-3 bg-gray-200 dark:bg-slate-700 rounded" />
                                <div className="w-8 h-4 bg-emerald-100 dark:bg-emerald-900/30 rounded text-[7px] text-emerald-600 flex items-center justify-center">مدفوع</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Notification */}
            <motion.div
                initial={{ opacity: 0, x: 30, y: -10 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1, type: 'spring' }}
                className="absolute -top-4 -left-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3
          border border-gray-100 dark:border-slate-700 flex items-center gap-2 z-10"
            >
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 text-sm">✓</div>
                <div>
                    <div className="text-[9px] font-bold text-gray-800 dark:text-white">فاتورة جديدة</div>
                    <div className="text-[8px] text-gray-400">تم إنشاء الفاتورة #٣٤٧ بنجاح</div>
                </div>
            </motion.div>

            {/* Floating Stats Card */}
            <motion.div
                initial={{ opacity: 0, x: -30, y: 10 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.2, type: 'spring' }}
                className="absolute -bottom-4 -right-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3
          border border-gray-100 dark:border-slate-700 z-10"
            >
                <div className="text-[8px] text-gray-400">أرباح الأسبوع</div>
                <div className="text-sm font-extrabold text-gray-800 dark:text-white">٢٤,٨٥٠ ر.س</div>
                <div className="text-[9px] text-emerald-500 font-bold">↑ ١٢.٥٪ عن الأسبوع الماضي</div>
            </motion.div>
        </motion.div>
    </div>
);

// ─── Step Illustration SVGs ─────────────────────────────────────────
export const StepIllustration: React.FC<{ step: number; className?: string }> = ({ step, className = '' }) => {
    const illustrations: Record<number, React.ReactNode> = {
        1: (
            <svg viewBox="0 0 120 120" fill="none" className={`w-full h-full ${className}`}>
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
                        <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.05 }} />
                    </linearGradient>
                </defs>
                <rect x="15" y="25" width="90" height="70" rx="12" fill="url(#grad1)" className="stroke-blue-400/30" strokeWidth="1.5" />
                <rect x="25" y="38" width="30" height="8" rx="3" className="fill-blue-500 shadow-sm" />
                <rect x="25" y="52" width="50" height="4" rx="2" className="fill-gray-200 dark:fill-slate-700" />
                <rect x="25" y="62" width="40" height="4" rx="2" className="fill-gray-200 dark:fill-slate-700" />
                <rect x="25" y="72" width="60" height="4" rx="2" className="fill-gray-200 dark:fill-slate-700" />
                <motion.circle
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    cx="85" cy="55" r="15" className="fill-blue-500/10"
                />
                <circle cx="85" cy="55" r="10" className="fill-blue-500/20 stroke-blue-500" strokeWidth="2" />
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    d="M81 55l3 3 5-6" className="stroke-blue-500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
            </svg>
        ),
        2: (
            <svg viewBox="0 0 120 120" fill="none" className={`w-full h-full ${className}`}>
                <defs>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.2 }} />
                        <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0.05 }} />
                    </linearGradient>
                </defs>
                <rect x="20" y="20" width="80" height="80" rx="12" fill="url(#grad2)" className="stroke-emerald-400/30" strokeWidth="1.5" />
                <rect x="32" y="32" width="56" height="12" rx="4" className="fill-emerald-500 shadow-sm" />
                <line x1="32" y1="52" x2="88" y2="52" className="stroke-gray-200 dark:stroke-slate-700" strokeWidth="1.5" strokeDasharray="4 2" />
                {[58, 68, 78].map((y, i) => (
                    <motion.g
                        key={y}
                        initial={{ opacity: 0, x: -5 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                    >
                        <rect x="32" y={y} width="40" height="4" rx="2" className="fill-gray-200 dark:fill-slate-700" />
                        <rect x="76" y={y} width="12" height="4" rx="2" className="fill-emerald-400/40" />
                    </motion.g>
                ))}
            </svg>
        ),
        3: (
            <svg viewBox="0 0 120 120" fill="none" className={`w-full h-full ${className}`}>
                <defs>
                    <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.2 }} />
                        <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0.05 }} />
                    </linearGradient>
                </defs>
                <rect x="15" y="25" width="90" height="70" rx="12" fill="url(#grad3)" className="stroke-orange-400/30" strokeWidth="1.5" />
                {[{ x: 28, h: 40 }, { x: 42, h: 25 }, { x: 56, h: 50 }, { x: 70, h: 30 }, { x: 84, h: 45 }].map(({ x, h }, i) => (
                    <motion.rect
                        key={i}
                        initial={{ height: 0, y: 90 }}
                        whileInView={{ height: h, y: 90 - h }}
                        transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                        x={x} width="8" rx="3" className="fill-orange-500 shadow-sm" opacity={0.4 + i * 0.1}
                    />
                ))}
                <motion.path
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    points="28,65 42,55 56,40 70,50 84,35"
                    d="M28 65l14-10 14-15 14 10 14-15"
                    className="stroke-orange-600 shadow-lg" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
                />
            </svg>
        ),
    };
    return <>{illustrations[step] || null}</>;
};

// ─── Automotive SVG Pattern ─────────────────────────────────────────
export const AutoPattern: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg className={`absolute opacity-[0.03] dark:opacity-[0.02] ${className}`} viewBox="0 0 400 400" fill="currentColor">
        <g transform="translate(50,50)">
            <path d="M30,0 A30,30 0 1,1 -30,0 A30,30 0 1,1 30,0 M20,0 A20,20 0 1,0 -20,0 A20,20 0 1,0 20,0" />
            {[0, 60, 120, 180, 240, 300].map(a => <rect key={a} x="-4" y="-35" width="8" height="12" rx="2" transform={`rotate(${a})`} />)}
        </g>
        <g transform="translate(300,100)">
            <path d="M20,0 A20,20 0 1,1 -20,0 A20,20 0 1,1 20,0 M12,0 A12,12 0 1,0 -12,0 A12,12 0 1,0 12,0" />
            {[0, 60, 120, 180, 240, 300].map(a => <rect key={a} x="-3" y="-24" width="6" height="8" rx="1.5" transform={`rotate(${a})`} />)}
        </g>
        <g transform="translate(200,300)">
            <path d="M25,0 A25,25 0 1,1 -25,0 A25,25 0 1,1 25,0 M16,0 A16,16 0 1,0 -16,0 A16,16 0 1,0 16,0" />
            {[0, 60, 120, 180, 240, 300].map(a => <rect key={a} x="-3.5" y="-30" width="7" height="10" rx="2" transform={`rotate(${a})`} />)}
        </g>
        <g transform="translate(100,250)">
            <rect x="-15" y="-25" width="30" height="50" rx="4" />
            <circle cx="0" cy="-15" r="5" fill="none" strokeWidth="2" stroke="currentColor" />
            <rect x="-10" y="5" width="20" height="3" rx="1" />
            <rect x="-10" y="12" width="20" height="3" rx="1" />
        </g>
        <g transform="translate(330,280)">
            <path d="M-20,-8 L20,-8 L25,0 L25,10 L-25,10 L-25,0 Z" />
            <circle cx="-12" cy="10" r="6" fill="none" strokeWidth="2" stroke="currentColor" />
            <circle cx="12" cy="10" r="6" fill="none" strokeWidth="2" stroke="currentColor" />
        </g>
    </svg>
);
