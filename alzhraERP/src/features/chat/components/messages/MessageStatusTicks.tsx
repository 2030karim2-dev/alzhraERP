import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';
import type { DeliveryStatus } from '../../types';

interface Props {
  status?: DeliveryStatus | undefined;
  isOptimistic?: boolean | undefined;
  className?: string | undefined;
}

export const MessageStatusTicks: React.FC<Props> = ({
  status = 'sent',
  isOptimistic,
  className = '',
}) => {
  if (isOptimistic) {
    return (
      <span title="جاري الإرسال">
        <Clock size={11} className={`animate-spin opacity-80 ${className}`} />
      </span>
    );
  }

  if (status === 'read') {
    return (
      <span title="تمت القراءة">
        <CheckCheck size={14} className={`text-sky-400 dark:text-sky-300 ${className}`} />
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span title="تم التسليم">
        <CheckCheck size={14} className={`opacity-70 ${className}`} />
      </span>
    );
  }

  return (
    <span title="تم الإرسال">
      <Check size={13} className={`opacity-70 ${className}`} />
    </span>
  );
};
