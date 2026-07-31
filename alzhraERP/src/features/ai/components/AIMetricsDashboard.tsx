import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Database } from 'lucide-react';
import { aiMetrics, AIMetric } from '../core/metrics';
import { aiFeedback } from '../core/feedback';

export const AIMetricsDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<AIMetric[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [feedbackSummary, setFeedbackSummary] = useState<any>(null);

    useEffect(() => {
        // In a real app, this would fetch from an API
        // For now, we just read from the local trackers
        const updateData = () => {
            setMetrics(aiMetrics.getMetrics());
            setSummary(aiMetrics.getSummary());
            setFeedbackSummary(aiFeedback.getAccuracyMetrics());
        };

        updateData();
        const interval = setInterval(updateData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!summary) {
        return <div className="p-4 text-gray-500">لا توجد بيانات أداء متاحة بعد.</div>;
    }

    return (
        <div className="space-y-6 p-4 font-cairo">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Activity className="text-blue-500" />
                لوحة مراقبة أداء الذكاء الاصطناعي
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="text-sm text-gray-500 mb-1">إجمالي الطلبات</div>
                    <div className="text-2xl font-bold">{summary.totalCalls}</div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="text-sm text-gray-500 mb-1">معدل النجاح</div>
                    <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                        {summary.successRate.toFixed(1)}%
                        <CheckCircle size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="text-sm text-gray-500 mb-1">متوسط زمن الاستجابة</div>
                    <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                        {(summary.averageLatencyMs / 1000).toFixed(2)}s
                        <Clock size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="text-sm text-gray-500 mb-1">معدل قبول المستخدم (الدقة)</div>
                    <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                        {feedbackSummary ? `${feedbackSummary.acceptanceRate.toFixed(1)}%` : 'N/A'}
                        <Database size={20} />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 font-bold">
                    سجل الطلبات الأخيرة
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500">
                            <tr>
                                <th className="p-3">الوقت</th>
                                <th className="p-3">النموذج</th>
                                <th className="p-3">نوع المهمة</th>
                                <th className="p-3">الزمن</th>
                                <th className="p-3">الحالة</th>
                                <th className="p-3">الرموز (Tokens)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.slice(-10).reverse().map(m => (
                                <tr key={m.id} className="border-b border-gray-50 dark:border-slate-800/50">
                                    <td className="p-3">{new Date(m.timestamp).toLocaleTimeString()}</td>
                                    <td className="p-3">{m.model}</td>
                                    <td className="p-3">{m.taskType}</td>
                                    <td className="p-3">{(m.latencyMs / 1000).toFixed(2)}s</td>
                                    <td className="p-3">
                                        {m.success ? (
                                            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={14} /> نجاح</span>
                                        ) : (
                                            <span className="text-rose-600 flex items-center gap-1"><XCircle size={14} /> فشل ({m.errorType})</span>
                                        )}
                                    </td>
                                    <td className="p-3">{m.tokensUsed?.total || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
