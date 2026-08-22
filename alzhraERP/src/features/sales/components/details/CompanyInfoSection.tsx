import React from 'react';
import { Building2, MapPin, Phone } from 'lucide-react';

interface CompanyInfoSectionProps {
  company: any;
  user: any;
}

const CompanyInfoSection: React.FC<CompanyInfoSectionProps> = ({ company, user }) => {
  return (
    <div className="bg-[var(--app-surface)] rounded-xl p-4 border border-[var(--app-border)]">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={16} className="text-slate-600 dark:text-slate-400" />
        <h3 className="font-bold text-[var(--app-text)] text-sm">معلومات الشركة</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">الشركة:</span>
          <span className="text-slate-600 dark:text-slate-400">
            {company?.name_ar || company?.name || user?.company_name || 'الزهراء سمارت'}
          </span>
        </div>
        {company?.address && (
          <div className="flex items-center gap-2 col-span-2">
            <MapPin size={14} className="text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">{company.address}</span>
          </div>
        )}
        {company?.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-slate-500" />
            <span className="text-slate-600 dark:text-slate-400">{company.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyInfoSection;
