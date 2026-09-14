import React from 'react';
import { formatLocalDate } from '../../../../core/utils/dateUtils';

interface Props {
  dateStr: string;
}

export const DateSeparatorBadge: React.FC<Props> = ({ dateStr }) => {
  const messageDate = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const localMsgDateStr = formatLocalDate(messageDate);
  const localTodayStr = formatLocalDate(today);
  const localYesterdayStr = formatLocalDate(yesterday);

  let label: string;
  if (localMsgDateStr === localTodayStr) {
    label = 'اليوم';
  } else if (localMsgDateStr === localYesterdayStr) {
    label = 'أمس';
  } else {
    label = messageDate.toLocaleDateString('ar-SA-u-nu-latn', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="my-3 flex items-center justify-center">
      <span className="bg-[var(--app-surface)]/90 shadow-2xs backdrop-blur-xs rounded-full border border-[var(--app-border)] px-3 py-0.5 text-[10px] font-semibold text-[var(--app-text-secondary)]">
        {label}
      </span>
    </div>
  );
};
