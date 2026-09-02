import React from 'react';
import { Building2, ShoppingBag, Package, FileText, Clock } from 'lucide-react';
import { cn } from '../../../../core/utils';
import type { PublicPortalContext } from '../../types';

interface PortalHeaderProps {
  company: PublicPortalContext['company'];
  supplier: PublicPortalContext['supplier'];
  draftCount: number;
  onOpenDrawer: () => void;
  activeTab: 'reorder' | 'rfqs' | 'quotations';
  setActiveTab: (tab: 'reorder' | 'rfqs' | 'quotations') => void;
  reorderCount: number;
  rfqsCount: number;
  quotationsCount: number;
  onSelectReorderTab: () => void;
}

const CompanyBrand: React.FC<{ company: PublicPortalContext['company'] }> = ({ company }) => {
  const logo = company.logo_url;
  const hasLogo = typeof logo === 'string' && logo.length > 0;
  const nameAr =
    typeof company.name_ar === 'string' && company.name_ar.length > 0
      ? company.name_ar
      : 'بوابة الموردين';
  const phone = company.phone;
  const hasPhone = typeof phone === 'string' && phone.length > 0;
  const taxNumber = company.tax_number;
  const hasTaxNumber = typeof taxNumber === 'string' && taxNumber.length > 0;

  return (
    <div className="flex items-center gap-3">
      {hasLogo ? (
        <img
          src={logo}
          alt={nameAr}
          className="h-10 w-10 rounded-xl border border-slate-700 bg-white object-contain p-1"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
          <Building2 size={20} />
        </div>
      )}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-black text-white">{nameAr}</h1>
          <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
            بوابة الموردين الذكية
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {hasPhone && <span dir="ltr">📞 {phone}</span>}
          {hasTaxNumber && <span>• الضريبي: {taxNumber}</span>}
        </div>
      </div>
    </div>
  );
};

interface TopBarProps {
  company: PublicPortalContext['company'];
  supplier: PublicPortalContext['supplier'];
  draftCount: number;
  onOpenDrawer: () => void;
}

const PortalTopBar: React.FC<TopBarProps> = ({ company, supplier, draftCount, onOpenDrawer }) => (
  <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md">
    <div className="mx-auto max-w-7xl px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CompanyBrand company={company} />

        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-1.5 text-right">
            <span className="text-[10px] font-medium text-slate-400">المورد المعتمد:</span>
            <p className="text-xs font-black text-emerald-400">{supplier.name}</p>
          </div>

          <button
            type="button"
            onClick={onOpenDrawer}
            className="relative flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500"
          >
            <ShoppingBag size={16} />
            <span>عربة التسعير ({draftCount})</span>
            {draftCount > 0 && (
              <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 font-mono text-[10px] font-bold text-white shadow-sm">
                {draftCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  </header>
);

interface StatCardProps {
  title: string;
  count: number;
  caption: string;
  icon: React.ReactNode;
  isActive: boolean;
  activeColor: string;
  onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  count,
  caption,
  icon,
  isActive,
  activeColor,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full rounded-2xl border p-4 text-right transition-all',
      isActive ? activeColor : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
    )}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-400">{title}</span>
      {icon}
    </div>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="font-mono text-2xl font-black text-white">{count}</span>
      <span className="text-[10px] font-bold text-slate-400">{caption}</span>
    </div>
  </button>
);

interface StatsProps {
  activeTab: 'reorder' | 'rfqs' | 'quotations';
  setActiveTab: (tab: 'reorder' | 'rfqs' | 'quotations') => void;
  reorderCount: number;
  rfqsCount: number;
  quotationsCount: number;
  onSelectReorderTab: () => void;
}

const ReorderIcon: React.FC = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
    <Package size={16} />
  </div>
);

const RfqsIcon: React.FC = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
    <FileText size={16} />
  </div>
);

const QuotationsIcon: React.FC = () => (
  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
    <Clock size={16} />
  </div>
);

const PortalStatsOverview: React.FC<StatsProps> = ({
  activeTab,
  setActiveTab,
  reorderCount,
  rfqsCount,
  quotationsCount,
  onSelectReorderTab,
}) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <StatCard
      title="أصناف تحتاج توريد وإعادة طلب"
      count={reorderCount}
      caption="صنف منخفض بالمخزون"
      icon={<ReorderIcon />}
      isActive={activeTab === 'reorder'}
      activeColor="border-emerald-500/50 bg-emerald-950/20 shadow-md shadow-emerald-500/5"
      onClick={onSelectReorderTab}
    />

    <StatCard
      title="طلبات التسعير النشطة (RFQs)"
      count={rfqsCount}
      caption="طلب جاهز للتسعير"
      icon={<RfqsIcon />}
      isActive={activeTab === 'rfqs'}
      activeColor="border-blue-500/50 bg-blue-950/20 shadow-md shadow-blue-500/5"
      onClick={() => {
        setActiveTab('rfqs');
      }}
    />

    <StatCard
      title="سجل عروض الأسعار السابقة"
      count={quotationsCount}
      caption="عرض مرسل ومسجل"
      icon={<QuotationsIcon />}
      isActive={activeTab === 'quotations'}
      activeColor="border-purple-500/50 bg-purple-950/20 shadow-md shadow-purple-500/5"
      onClick={() => {
        setActiveTab('quotations');
      }}
    />
  </div>
);

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  company,
  supplier,
  draftCount,
  onOpenDrawer,
  activeTab,
  setActiveTab,
  reorderCount,
  rfqsCount,
  quotationsCount,
  onSelectReorderTab,
}) => {
  return (
    <>
      <PortalTopBar
        company={company}
        supplier={supplier}
        draftCount={draftCount}
        onOpenDrawer={onOpenDrawer}
      />
      <PortalStatsOverview
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reorderCount={reorderCount}
        rfqsCount={rfqsCount}
        quotationsCount={quotationsCount}
        onSelectReorderTab={onSelectReorderTab}
      />
    </>
  );
};
