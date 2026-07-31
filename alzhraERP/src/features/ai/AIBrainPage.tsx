import React, { useState } from 'react';
import { BrainCircuit, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import { useDebtManagement } from './hooks/useDebtManagement';
import { AIMetricsDashboard } from './components/AIMetricsDashboard';
import { DebtOverviewCards } from './components/debt/DebtOverviewCards';
import { UrgentAlertsList } from './components/debt/UrgentAlertsList';
import { SmartRemindersPanel } from './components/debt/SmartRemindersPanel';
import { CustomerRiskTable } from './components/debt/CustomerRiskTable';
import { DebtChatAssistant } from './components/debt/DebtChatAssistant';
import PageLoader from '../../ui/base/PageLoader';

const AIBrainPage: React.FC = () => {
    const { loading, error, metrics, customers, alerts, reminders, refreshData } = useDebtManagement();
    const [activeTab, setActiveTab] = useState<'debt' | 'metrics'>('debt');

    if (loading) return <PageLoader />;

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <BrainCircuit className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">عقل الجعفري</h1>
                        <p className="text-sm font-medium text-gray-500 mt-1">مساعد إدارة الديون وعلاقات العملاء الذكي</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setActiveTab('debt')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'debt' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                    >
                        <BrainCircuit className="w-4 h-4" /> إدارة الديون
                    </button>
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'metrics' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                    >
                        <Activity className="w-4 h-4" /> أداء الذكاء الاصطناعي
                    </button>
                    <button
                        onClick={refreshData}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> تحديث البيانات
                    </button>
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="text-red-500 mb-4"><AlertCircle size={48} /></div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">خطأ في تحميل بيانات الجعفري</h2>
                    <p className="text-gray-600 max-w-md text-center">{error}</p>
                    <button
                        onClick={refreshData}
                        className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <RefreshCw size={16} /> إعادة المحاولة
                    </button>
                </div>
            ) : activeTab === 'metrics' ? (
                <AIMetricsDashboard />
            ) : (
                <>
                    {/* Metrics Overview */}
                    <DebtOverviewCards metrics={metrics} />

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left/Middle Column - Risk Table & Reminders */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="flex-1">
                                <CustomerRiskTable customers={customers} />
                            </div>
                            <div className="h-[400px]">
                                <SmartRemindersPanel reminders={reminders} />
                            </div>
                        </div>

                        {/* Right Column - Alerts and AI Chat */}
                        <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                            <UrgentAlertsList alerts={alerts} />
                            <div className="flex-1 min-h-[500px]">
                                <DebtChatAssistant debtContext={{ metrics, customers, alerts, reminders }} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AIBrainPage;
