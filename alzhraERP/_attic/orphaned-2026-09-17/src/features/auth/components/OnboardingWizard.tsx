import React, { useState } from 'react';
import { Check, ChevronLeft, Building2, Package, Users, Wallet } from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    id: 'currency',
    title: 'العملة',
    description: 'حدد العملة الافتراضية للنظام',
    icon: <Wallet size={24} className="text-blue-600" />,
  },
  {
    id: 'warehouse',
    title: 'المستودع',
    description: 'أنشئ أول مستودع للمخزون',
    icon: <Building2 size={24} className="text-emerald-600" />,
  },
  {
    id: 'product',
    title: 'أول منتج',
    description: 'أضف أول منتج في مخزونك',
    icon: <Package size={24} className="text-amber-600" />,
  },
  {
    id: 'customer',
    title: 'أول عميل',
    description: 'سجل أول عميل للبدء بالبيع',
    icon: <Users size={24} className="text-violet-600" />,
  },
];

interface OnboardingData {
  currency: string;
  warehouseName: string;
  productName: string;
  productPrice: string;
  customerName: string;
  customerPhone: string;
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
  className?: string;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip, className }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    currency: 'SAR',
    warehouseName: 'المستودع الرئيسي',
    productName: '',
    productPrice: '',
    customerName: '',
    customerPhone: '',
  });

  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const updateField = (field: keyof OnboardingData, value: string): void => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = (): void => {
    if (isLast) {
      onComplete(data);
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  return (
    <div
      className={cn(
        'mx-auto max-w-lg rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-xl',
        className
      )}
    >
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-bold transition-all',
                idx < currentStep
                  ? 'bg-emerald-600 text-white'
                  : idx === currentStep
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)]'
              )}
            >
              {idx < currentStep ? <Check size={14} /> : idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  idx < currentStep ? 'bg-emerald-500' : 'bg-[var(--app-border)]'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          {steps[currentStep].icon}
          <div>
            <h3 className="text-base font-black text-[var(--app-text)]">
              {steps[currentStep].title}
            </h3>
            <p className="text-xs text-[var(--app-text-secondary)]">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {currentStep === 0 && (
            <Input
              label="العملة"
              value={data.currency}
              onChange={e => {
                updateField('currency', e.target.value);
              }}
              placeholder="مثلاً: SAR, USD, EGP"
              icon={<Wallet size={14} />}
            />
          )}
          {currentStep === 1 && (
            <Input
              label="اسم المستودع"
              value={data.warehouseName}
              onChange={e => {
                updateField('warehouseName', e.target.value);
              }}
              placeholder="المستودع الرئيسي"
              icon={<Building2 size={14} />}
            />
          )}
          {currentStep === 2 && (
            <>
              <Input
                label="اسم المنتج"
                value={data.productName}
                onChange={e => {
                  updateField('productName', e.target.value);
                }}
                placeholder="مثلاً: فلتر زيت"
                icon={<Package size={14} />}
              />
              <Input
                label="سعر البيع"
                value={data.productPrice}
                onChange={e => {
                  updateField('productPrice', e.target.value);
                }}
                placeholder="0.00"
                type="number"
                icon={<Wallet size={14} />}
              />
            </>
          )}
          {currentStep === 3 && (
            <>
              <Input
                label="اسم العميل"
                value={data.customerName}
                onChange={e => {
                  updateField('customerName', e.target.value);
                }}
                placeholder="اسم العميل"
                icon={<Users size={14} />}
              />
              <Input
                label="رقم الهاتف"
                value={data.customerPhone}
                onChange={e => {
                  updateField('customerPhone', e.target.value);
                }}
                placeholder="05xxxxxxxx"
                type="tel"
              />
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-xs font-semibold text-[var(--app-text-secondary)] transition-colors hover:text-[var(--app-text)]"
        >
          تخطي للوحة التحكم
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button
              variant="ghost"
              onClick={() => {
                setCurrentStep(prev => prev - 1);
              }}
            >
              السابق
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleNext}
            rightIcon={isLast ? <Check size={14} /> : <ChevronLeft size={14} />}
          >
            {isLast ? 'إنهاء' : 'التالي'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
