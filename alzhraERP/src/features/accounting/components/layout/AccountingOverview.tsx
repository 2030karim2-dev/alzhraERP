import React from 'react';
import AccountingStats from './AccountingStats';
import QuickActions from '../overview/QuickActions';
import KeyAccountBalances from '../overview/KeyAccountBalances';
import RecentJournals from '../overview/RecentJournals';
import FinancialPerformanceChart from '../overview/FinancialPerformanceChart';
import { BarChart3, Activity } from 'lucide-react';
import Card from '../../../../ui/base/Card';

const AccountingOverview: React.FC = () => {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Top Stats Bar */}
      <div className="space-y-2">
         <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
            <Activity size={14} className="text-blue-500" /> الحالة المالية اللحظية
         </h3>
         <AccountingStats />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 rounded-none">
              <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-4 px-1 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-500" />
                أداء الإيرادات مقابل المصروفات
              </h3>
              <FinancialPerformanceChart />
            </Card>
            <RecentJournals />
        </div>
        
        {/* Sidebar Column */}
        <div className="lg:col-span-1 space-y-4">
            <QuickActions />
            <KeyAccountBalances />
        </div>
      </div>
    </div>
  );
};

export default AccountingOverview;
