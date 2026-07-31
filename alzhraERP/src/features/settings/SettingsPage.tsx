import React, { useState, useMemo } from 'react';
import { Settings, Building, ShieldCheck, Banknote, Users, FileText, Calculator, Package, Link, Search, ChevronLeft, User, GitBranch } from 'lucide-react';
import CompanyProfile from './components/CompanyProfile';
import BranchManager from './components/branches/BranchManager';
import PersonalProfile from './components/PersonalProfile';
import FinancialSettings from './components/financial/FinancialSettings';
import SecuritySettings from './components/security/SecuritySettings';
import PermissionsManager from './components/security/PermissionsManager';
import TeamManager from './components/security/TeamManager';
import NotificationSettings from './components/notifications/NotificationSettings';
import AppearancePage from '../appearance/AppearancePage';
import BackupPage from './components/backup/BackupPage';
import InvoiceSettings from './components/invoice/InvoiceSettings';
import POSSettings from './components/pos/POSSettings';
import InventorySettings from './components/inventory/InventorySettings';
import PrintSettings from './components/print';
import IntegrationsSettings from './components/integrations/IntegrationsSettings';
import LocalizationSettings from './components/localization/LocalizationSettings';
import { SettingsSection } from './types';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { cn } from '../../core/utils';
import { useBreakpoint } from '../../lib/hooks/useBreakpoint';

interface MenuGroup {
  title: string;
  items: { id: SettingsSection; label: string; icon: any; desc: string; color: string }[];
}

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { t } = useTranslation();
  const isDesktop = useBreakpoint('lg');

  const menuGroups: MenuGroup[] = [
    {
      title: 'عام',
      items: [
        { id: 'profile', label: 'الملف الشخصي', icon: User, desc: 'إدارة بياناتك الشخصية وحسابك', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
        { id: 'company', label: t('company_profile'), icon: Building, desc: 'الهوية والمعلومات القانونية', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
        { id: 'branches', label: 'فروع الشركة', icon: GitBranch, desc: 'إدارة الفروع والمواقع الجغرافية', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
        { id: 'preferences', label: 'تفضيلات النظام', icon: Settings, desc: 'المظهر واللغة والإشعارات', color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30' },
      ]
    },
    {
      title: 'مالي ومحاسبي',
      items: [
        { id: 'financial', label: t('financial_settings'), icon: Banknote, desc: 'العملات والضرائب والفترات', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
        { id: 'invoice', label: t('invoice_settings'), icon: FileText, desc: 'تخصيص الفواتير والطباعة', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' },
        { id: 'pos', label: t('pos_settings'), icon: Calculator, desc: 'نقطة البيع والكاشير', color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30' },
      ]
    },
    {
      title: 'المخزون والتكامل',
      items: [
        { id: 'inventory', label: t('inventory_settings'), icon: Package, desc: 'المستودعات والتتبع', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30' },
        { id: 'integrations', label: t('integrations_settings'), icon: Link, desc: 'الربط مع أنظمة خارجية', color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30' },
      ]
    },
    {
      title: 'الأمان والفريق',
      items: [
        { id: 'team', label: t('team_settings'), icon: Users, desc: 'إدارة المستخدمين والأدوار', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
        { id: 'security', label: t('security_settings'), icon: ShieldCheck, desc: 'الأمان والنسخ الاحتياطي', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' },
      ]
    },
  ];

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return menuGroups;
    const q = searchQuery.toLowerCase();
    return menuGroups.map(g => ({
      ...g,
      items: g.items.filter(i => i.label.includes(q) || i.desc.includes(q))
    })).filter(g => g.items.length > 0);
  }, [searchQuery, menuGroups]);

  const allItems = menuGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === activeSection);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile': return <PersonalProfile />;
      case 'company': return <CompanyProfile />;
      case 'branches': return <BranchManager />;
      case 'financial': return <FinancialSettings />;
      case 'preferences':
        return (
          <div className="space-y-8">
            <AppearancePage />
            <div className="px-4"><LocalizationSettings /></div>
            <div className="px-4"><NotificationSettings /></div>
          </div>
        );
      case 'invoice':
        return (
          <div className="space-y-8">
            <InvoiceSettings />
            <div className="px-4"><PrintSettings /></div>
          </div>
        );
      case 'pos': return <POSSettings />;
      case 'inventory': return <InventorySettings />;
      case 'integrations': return <IntegrationsSettings />;
      case 'team':
        return (
          <div className="space-y-8">
            <TeamManager />
            <div className="px-4"><PermissionsManager /></div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-8">
            <SecuritySettings />
            <div className="px-4"><BackupPage /></div>
          </div>
        );
      default: return <CompanyProfile />;
    }
  };

  // Mobile: horizontal tabs
  if (!isDesktop) {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 overflow-hidden font-cairo">
        {/* Mobile Header */}
        <div className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 px-3 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-slate-900 dark:bg-blue-600 text-white rounded-lg">
              <Settings size={14} />
            </div>
            <h1 className="text-xs font-bold text-gray-800 dark:text-white uppercase">{t('system_settings')}</h1>
          </div>
          <div className="overflow-x-auto custom-scrollbar -mx-3 px-3">
            <div className="flex gap-1.5 min-w-max pb-1">
              {allItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all shrink-0",
                    activeSection === item.id
                      ? "bg-slate-900 dark:bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon size={12} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
          <div className="animate-in fade-in duration-500">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: sidebar layout
  return (
    <div className="flex h-full bg-[#f8fafc] dark:bg-slate-950 overflow-hidden font-cairo">
      {/* Sidebar */}
      <div className={cn(
        "h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col transition-all duration-300 shrink-0 shadow-sm",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-slate-900 to-slate-700 dark:from-blue-600 dark:to-indigo-700 text-white rounded-lg shadow-md">
                <Settings size={14} />
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-tight">
                  {t('system_settings')}
                </h1>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            >
              <ChevronLeft size={14} className={cn("transition-transform", sidebarCollapsed && "rotate-180")} />
            </button>
          </div>

          {/* Search */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="بحث في الإعدادات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Sidebar Menu */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
          {filteredGroups.map((group, gIdx) => (
            <div key={gIdx}>
              {!sidebarCollapsed && (
                <div className="px-2 py-1">
                  <span className="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                    {group.title}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-xl transition-all",
                      sidebarCollapsed ? "p-2 justify-center" : "px-2.5 py-2",
                      activeSection === item.id
                        ? "bg-slate-900 dark:bg-blue-600/20 text-white dark:text-blue-400 shadow-sm"
                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0 transition-colors",
                      activeSection === item.id
                        ? "bg-white/10 text-current"
                        : item.color
                    )}>
                      <item.icon size={14} />
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex-1 text-right min-w-0">
                        <span className={cn(
                          "block text-[11px] font-bold truncate",
                          activeSection === item.id ? "font-bold" : ""
                        )}>
                          {item.label}
                        </span>
                        <span className={cn(
                          "block text-[8px] truncate mt-0.5",
                          activeSection === item.id ? "text-white/60 dark:text-blue-400/60" : "text-gray-400 dark:text-slate-500"
                        )}>
                          {item.desc}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-gray-100 dark:border-slate-800">
            <div className="bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-2.5 border border-blue-100 dark:border-blue-900/30">
              <p className="text-[8px] font-bold text-blue-800 dark:text-blue-400 uppercase mb-0.5">الزهراء سمارت ERP</p>
              <p className="text-[7px] font-bold text-blue-600/60 dark:text-blue-400/50">v2.0 — نظام إدارة متكامل</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {activeItem && (
              <>
                <div className={cn("p-2 rounded-xl", activeItem.color)}>
                  <activeItem.icon size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">{activeItem.label}</h2>
                  <p className="text-[9px] font-bold text-gray-400 mt-0.5">{activeItem.desc}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/20 dark:bg-slate-950/20 h-full">
          <div className="animate-in fade-in duration-300 h-full flex flex-col">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;