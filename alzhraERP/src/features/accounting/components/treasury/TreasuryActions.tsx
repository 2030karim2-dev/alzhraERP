import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Printer, Coins } from 'lucide-react';
import Button from '../../../../ui/base/Button';

interface Props {
  onAction: (action: 'receipt' | 'payment' | 'transfer') => void;
  onPrint: () => void;
  showRevalue?: boolean;
  onRevalue?: () => void;
}

const TreasuryActions: React.FC<Props> = ({
  onAction,
  onPrint,
  showRevalue = false,
  onRevalue,
}) => {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Button
        onClick={() => {
          onAction('receipt');
        }}
        variant="success"
        className="flex-1"
        leftIcon={<ArrowDownLeft size={16} />}
      >
        سند قبض
      </Button>
      <Button
        onClick={() => {
          onAction('payment');
        }}
        variant="danger"
        className="flex-1"
        leftIcon={<ArrowUpRight size={16} />}
      >
        سند صرف
      </Button>
      <Button
        onClick={() => {
          onAction('transfer');
        }}
        variant="outline"
        className="flex-1"
        leftIcon={<ArrowRightLeft size={16} />}
      >
        تحويل داخلي
      </Button>
      {showRevalue && onRevalue && (
        <Button
          onClick={onRevalue}
          variant="secondary"
          className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-300"
          leftIcon={<Coins size={15} className="text-purple-600" />}
          title="إعادة تقييم فروق العملة الدورية"
        >
          تقييم العملة
        </Button>
      )}
      <Button onClick={onPrint} variant="secondary" aria-label="طباعة" className="px-3">
        <Printer size={18} />
      </Button>
    </div>
  );
};

export default TreasuryActions;
