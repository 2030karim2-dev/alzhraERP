import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Printer } from 'lucide-react';
import Button from '../../../../ui/base/Button';

interface Props {
    onAction: (action: 'receipt' | 'payment' | 'transfer') => void;
    onPrint: () => void;
}

const TreasuryActions: React.FC<Props> = ({ onAction, onPrint }) => {
    return (
        <div className="flex gap-2 mb-4">
            <Button
                onClick={() => onAction('receipt')}
                className="flex-1 bg-emerald-600/50 hover:bg-emerald-600/50 text-white cursor-not-allowed opacity-70"
                leftIcon={<ArrowDownLeft size={16} />}
                disabled
                title="قريباً"
            >
                سند قبض (قريباً)
            </Button>
            <Button
                onClick={() => onAction('payment')}
                className="flex-1 bg-red-600/50 hover:bg-red-600/50 text-white cursor-not-allowed opacity-70"
                leftIcon={<ArrowUpRight size={16} />}
                disabled
                title="قريباً"
            >
                سند صرف (قريباً)
            </Button>
            <Button
                onClick={() => onAction('transfer')}
                variant="outline"
                className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                leftIcon={<ArrowRightLeft size={16} />}
            >
                تحويل داخلي
            </Button>
            <Button
                onClick={onPrint}
                variant="secondary"
                className="px-3"
            >
                <Printer size={18} />
            </Button>
        </div>
    );
};

export default TreasuryActions;
