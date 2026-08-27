import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Printer } from 'lucide-react';
import Button from '../../../../ui/base/Button';

interface Props {
    onAction: (action: 'receipt' | 'payment' | 'transfer') => void;
    onPrint: () => void;
}

const TreasuryActions: React.FC<Props> = ({ onAction, onPrint }) => {
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            <Button
                onClick={() => onAction('receipt')}
                variant="success"
                className="flex-1"
                leftIcon={<ArrowDownLeft size={16} />}
            >
                سند قبض
            </Button>
            <Button
                onClick={() => onAction('payment')}
                variant="danger"
                className="flex-1"
                leftIcon={<ArrowUpRight size={16} />}
            >
                سند صرف
            </Button>
            <Button
                onClick={() => onAction('transfer')}
                variant="outline"
                className="flex-1"
                leftIcon={<ArrowRightLeft size={16} />}
            >
                تحويل داخلي
            </Button>
            <Button
                onClick={onPrint}
                variant="secondary"
                aria-label="طباعة"
                className="px-3"
            >
                <Printer size={18} />
            </Button>
        </div>
    );
};

export default TreasuryActions;
