import React from 'react';
import { Building2, MapPin, Phone } from 'lucide-react';

interface CompanyInfoSectionProps {
  company: any;
  user: any;
}

const CompanyInfoSection: React.FC<CompanyInfoSectionProps> = ({ company, user }) => {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-slate-300 dark:border-slate-600">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-slate-600 text-white rounded-lg">
          <Building2 size={18} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">معلومات الشركة</h3>
        </div>
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
