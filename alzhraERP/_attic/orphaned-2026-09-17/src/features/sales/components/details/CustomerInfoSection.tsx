import React from 'react';
import { User, Phone, MapPin } from 'lucide-react';

interface CustomerInfoSectionProps {
  party: any;
}

const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({ party }) => {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <User size={16} className="text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-bold text-[var(--app-text)]">معلومات العميل</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-700 dark:text-blue-300">الاسم:</span>
          <span className="text-gray-700 dark:text-slate-300">{party?.name || 'عميل نقدي'}</span>
        </div>
        {party?.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-blue-500" />
            <span className="text-gray-700 dark:text-slate-300">{party.phone}</span>
          </div>
        )}
        {party?.address && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-500" />
            <span className="text-gray-700 dark:text-slate-300">{party.address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInfoSection;
