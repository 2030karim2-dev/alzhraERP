import React, { useState, useMemo } from 'react';
import {
  Settings,
  Building,
  ShieldCheck,
  Banknote,
  Users,
  FileText,
  Calculator,
  Package,
  Link,
  Search,
  ChevronLeft,
  User,
  GitBranch,
  Moon,
} from 'lucide-react';
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
import DhikrSettings from './components/dhikr/DhikrSettings';
import type { SettingsSection } from './types';
import { useTranslation } from '../../lib/hooks/useTranslation';
import { cn } from '../../core/utils';
import { useBreakpoint } from '../../lib/hooks/useBreakpoint';

interface MenuGroup {
  title: string;
  items: Array<{ id: SettingsSection; label: string; icon: any; desc: string; color: string }>;
}

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { t } = useTranslation();
  const isDesktop = useBreakpoint('lg');

  const menuGroups: MenuGroup[] = [
    {
      title: t('settings_section_general'),
      items: [
        {
          id: 'profile',
          label: t('profile'),
          icon: User,
          desc: t('profile_desc'),
          color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
        },
        {
          id: 'company',
          label: t('company_profile'),
          icon: Building,
          desc: t('company_profile_desc'),
          color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
        },
        {
          id: 'branches',
          label: t('branches'),
          icon: GitBranch,
          desc: t('branches_desc'),
          color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
        },
        {
          id: 'preferences',
          label: t('preferences'),
          icon: Settings,
          desc: t('preferences_desc'),
          color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30',
        },
        {
          id: 'dhikr',
          label: t('dhikr'),
          icon: Moon,
          desc: t('dhikr_desc'),
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
        },
      ],
    },
    {
      title: t('settings_section_financial'),
      items: [
        {
          id: 'financial',
          label: t('financial_settings'),
          icon: Banknote,
          desc: t('financial_settings_desc'),
          color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
        },
        {
          id: 'invoice',
          label: t('invoice_settings'),
          icon: FileText,
          desc: t('invoice_settings_desc'),
          color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
        },
        {
          id: 'pos',
          label: t('pos_settings'),
          icon: Calculator,
          desc: t('pos_settings_desc'),
          color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
        },
      ],
    },
    {
      title: t('settings_section_inventory'),
      items: [
        {
          id: 'inventory',
          label: t('inventory_settings'),
          icon: Package,
          desc: t('inventory_settings_desc'),
          color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
        },
        {
          id: 'integrations',
          label: t('integrations_settings'),
          icon: Link,
          desc: t('integrations_settings_desc'),
          color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
        },
      ],
    },
    {
      title: t('settings_section_security'),
      items: [
        {
          id: 'team',
          label: t('team_settings'),
          icon: Users,
          desc: t('team_settings_desc'),
          color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
        },
        {
          id: 'security',
          label: t('security_settings'),
          icon: ShieldCheck,
          desc: t('security_settings_desc'),
          color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30',
        },
      ],
    },
  ];

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return menuGroups;
    const q = searchQuery.toLowerCase();
    return menuGroups
      .map(g => ({
        ...g,
        items: g.items.filter(i => i.label.includes(q) || i.desc.includes(q)),
      }))
      .filter(g => g.items.length > 0);
  }, [searchQuery, menuGroups]);

  const allItems = menuGroups.flatMap(g => g.items);
  const activeItem = allItems.find(i => i.id === activeSection);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return <PersonalProfile />;
      case 'company':
        return <CompanyProfile />;
      case 'branches':
        return <BranchManager />;
      case 'financial':
        return <FinancialSettings />;
      case 'preferences':
        return (
          <div className="space-y-8">
            <AppearancePage />
            <div className="px-4">
              <LocalizationSettings />
            </div>
            <div className="px-4">
              <NotificationSettings />
            </div>
          </div>
        );
      case 'dhikr':
        return <DhikrSettings />;
      case 'invoice':
        return (
          <div className="space-y-8">
            <InvoiceSettings />
            <div className="px-4">
              <PrintSettings />
            </div>
          </div>
        );
      case 'pos':
        return <POSSettings />;
      case 'inventory':
        return <InventorySettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'team':
        return (
          <div className="space-y-8">
            <TeamManager />
            <div className="px-4">
              <PermissionsManager />
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-8">
            <SecuritySettings />
            <div className="px-4">
              <BackupPage />
            </div>
          </div>
        );
      default:
        return <CompanyProfile />;
    }
  };

  // Mobile: horizontal tabs
  if (!isDesktop) {
    return (
      <div className="font-cairo flex h-full flex-col overflow-hidden bg-[var(--app-bg)]">
        {/* Mobile Header */}
        <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-slate-900 p-1.5 text-white dark:bg-blue-600">
              <Settings size={14} />
            </div>
            <h1 className="text-xs font-bold uppercase text-[var(--app-text)]">
              {t('system_settings')}
            </h1>
          </div>
          <div className="custom-scrollbar -mx-3 overflow-x-auto px-3">
            <div className="flex min-w-max gap-1.5 pb-1">
              {allItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all',
                    activeSection === item.id
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-blue-600'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                >
                  <item.icon size={12} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto pb-20">
          <div className="animate-in fade-in duration-500">{renderActiveSection()}</div>
        </div>
      </div>
    );
  }

  // Desktop: sidebar layout
  return (
    <div className="font-cairo flex h-full overflow-hidden bg-[#f8fafc] dark:bg-slate-950">
      {/* Sidebar */}
      <div
        className={cn(
          'flex h-full shrink-0 flex-col border-l border-gray-200 bg-[var(--app-surface)] shadow-sm transition-all duration-300 dark:border-slate-800',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Sidebar Header */}
        <div className="border-b border-gray-100 p-3 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 p-1.5 text-white shadow-md dark:from-blue-600 dark:to-indigo-700">
                <Settings size={14} />
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-xs font-bold uppercase tracking-tight text-gray-800 dark:text-white">
                  {t('system_settings')}
                </h1>
              )}
            </div>
            <button
              onClick={() => {
                setSidebarCollapsed(!sidebarCollapsed);
              }}
              className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ChevronLeft
                size={14}
                className={cn('transition-transform', sidebarCollapsed && 'rotate-180')}
              />
            </button>
          </div>

          {/* Search */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={13}
              />
              <input
                type="text"
                placeholder="بحث في الإعدادات..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full rounded-lg border border-gray-100 bg-gray-50 py-2 pl-3 pr-8 text-[10px] font-bold outline-none transition-colors focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Sidebar Menu */}
        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-2">
          {filteredGroups.map((group, gIdx) => (
            <div key={gIdx}>
              {!sidebarCollapsed && (
                <div className="px-2 py-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 dark:text-slate-500">
                    {group.title}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl transition-all',
                      sidebarCollapsed ? 'justify-center p-2' : 'px-2.5 py-2',
                      activeSection === item.id
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-blue-600/20 dark:text-blue-400'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <div
                      className={cn(
                        'shrink-0 rounded-lg p-1.5 transition-colors',
                        activeSection === item.id ? 'bg-white/10 text-current' : item.color
                      )}
                    >
                      <item.icon size={14} />
                    </div>
                    {!sidebarCollapsed && (
                      <div className="min-w-0 flex-1 text-right">
                        <span
                          className={cn(
                            'block truncate text-[11px] font-bold',
                            activeSection === item.id ? 'font-bold' : ''
                          )}
                        >
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 block truncate text-[10px]',
                            activeSection === item.id
                              ? 'text-white/60 dark:text-blue-400/60'
                              : 'text-gray-400 dark:text-slate-500'
                          )}
                        >
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
          <div className="border-t border-gray-100 p-3 dark:border-slate-800">
            <div className="rounded-xl border border-blue-100 bg-gradient-to-l from-blue-50 to-indigo-50 p-2.5 dark:border-blue-900/30 dark:from-blue-950/30 dark:to-indigo-950/30">
              <p className="mb-0.5 text-[10px] font-bold uppercase text-blue-800 dark:text-blue-400">
                الزهراء سمارت ERP
              </p>
              <p className="text-[10px] font-bold text-blue-600/60 dark:text-blue-400/50">
                v2.0 — نظام إدارة متكامل
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Content Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-[var(--app-surface)] px-6 py-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {activeItem && (
              <>
                <div className={cn('rounded-xl p-2', activeItem.color)}>
                  <activeItem.icon size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                    {activeItem.label}
                  </h2>
                  <p className="mt-0.5 text-[10px] font-bold text-gray-400">{activeItem.desc}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="custom-scrollbar h-full flex-1 overflow-y-auto bg-white/20 dark:bg-slate-950/20">
          <div className="animate-in fade-in flex h-full flex-col duration-300">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
