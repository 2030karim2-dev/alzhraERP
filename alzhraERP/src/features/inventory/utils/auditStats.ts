/** Summarizes audit draft rows without changing quantities or losing negative adjustments. */
export function calculateAuditStats(items: ReadonlyArray<Record<string, unknown>>) {
  let counted = 0;
  let discrepancies = 0;
  let matched = 0;
  let discrepancyValue = 0;

  for (const item of items) {
    const quantity = item.counted_quantity;
    if (quantity === null || quantity === undefined || quantity === '') continue;
    counted += 1;
    const difference = Number(quantity) - Number(item.expected_quantity);
    if (difference === 0) {
      matched += 1;
      continue;
    }
    discrepancies += 1;
    const product = (item.products as Record<string, unknown>) || item;
    const unitCost = Number(product.cost_price ?? product.purchase_price ?? 0);
    discrepancyValue += difference * unitCost;
  }

  return {
    total: items.length,
    counted,
    pending: items.length - counted,
    discrepancies,
    matched,
    discrepancyValue: Math.round(discrepancyValue * 100) / 100,
  };
}
