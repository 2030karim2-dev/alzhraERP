/** Format balance helper */
export const formatBalance = (balance: number | undefined): string => {
    if (balance === undefined || balance === null) return '—';
    const abs = Math.abs(balance);
    if (abs >= 1_000_000) return `${(balance / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(balance / 1_000).toFixed(1)}K`;
    return balance.toLocaleString('en-US');
};

/** Quick-amount chips for cash payment (frozen so consumers cannot mutate shared state). */
export const QUICK_AMOUNTS: readonly number[] = Object.freeze([500, 1000, 2000, 5000, 10000, 20000]);