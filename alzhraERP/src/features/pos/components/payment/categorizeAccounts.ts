import type { PaymentAccount } from './paymentTypes';

/**
 * Helper: Categorize accounts into cash/treasury and exchange companies.
 */
export function categorize(accounts: PaymentAccount[]) {
    const code = (a: PaymentAccount) => a.code ?? '';
    const name = (a: PaymentAccount) => a.name_ar ?? '';

    const cash = accounts.filter(a =>
        code(a).startsWith('101') ||
        name(a).includes('صندوق') ||
        name(a).includes('كاش')
    );
    const exchanges = accounts.filter(a =>
        code(a).startsWith('102') ||
        name(a).includes('صراف') ||
        name(a).includes('كريمي') ||
        name(a).includes('هويدي') ||
        name(a).includes('اهلي') ||
        name(a).includes('الأهلي') ||
        name(a).includes('المسار') ||
        name(a).includes('ذهبي') ||
        name(a).includes('سبأ') ||
        name(a).includes('امتياز') ||
        name(a).includes('وطني')
    );
    const rest = accounts.filter(a =>
        !cash.find(c => c.id === a.id) && !exchanges.find(e => e.id === a.id)
    );
    return { cash: [...cash, ...rest], exchanges };
}

/** Format balance helper */
export const formatBalance = (balance: number | undefined): string => {
    if (balance === undefined || balance === null) return '—';
    const abs = Math.abs(balance);
    if (abs >= 1_000_000) return `${(balance / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(balance / 1_000).toFixed(1)}K`;
    return balance.toLocaleString();
};

/** Quick-amount chips for cash payment */
export const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];