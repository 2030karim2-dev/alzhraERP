import React from 'react';
import { User, Phone, MapPin } from 'lucide-react';

interface CustomerInfoSectionProps {
  party: any;
}

const CustomerInfoSection: React.FC<CustomerInfoSectionProps> = ({ party }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-600 text-white rounded-lg">
          <User size={18} />
        </div>
        <div>
          <h3 className="font-bold text-blue-800 dark:text-blue-200 text-sm">معلومات العميل</h3>
        </div>
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
