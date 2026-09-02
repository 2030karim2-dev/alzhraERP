/**
 * Data Processor Web Worker
 * Offloads compute-heavy transformations and aggregations to prevent Main Thread frame drops.
 */

export interface WorkerTaskMessage {
  id: string;
  type: 'FILTER_DATASET' | 'CALCULATE_TOTALS' | 'PARSE_EXCEL_ROWS' | 'AGGREGATE_LEDGER';
  payload: any;
}

export interface WorkerResponseMessage {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

// Self-contained handlers
function handleFilterDataset(data: { items: any[]; filterCriteria: Record<string, any> }) {
  const { items, filterCriteria } = data;
  if (!Array.isArray(items)) return [];

  const keys = Object.keys(filterCriteria);
  if (keys.length === 0) return items;

  return items.filter(item => {
    return keys.every(key => {
      const criterion = filterCriteria[key];
      if (criterion === undefined || criterion === null || criterion === '') return true;
      const val = item[key];
      if (typeof val === 'string' && typeof criterion === 'string') {
        return val.toLowerCase().includes(criterion.toLowerCase());
      }
      return val === criterion;
    });
  });
}

function handleCalculateTotals(data: { items: any[]; numericFields: string[] }) {
  const { items, numericFields } = data;
  const totals: Record<string, number> = {};

  numericFields.forEach(field => {
    totals[field] = 0;
  });

  if (!Array.isArray(items)) return totals;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    numericFields.forEach(field => {
      const val = Number(item[field]);
      if (!isNaN(val)) {
        totals[field] += val;
      }
    });
  }

  return totals;
}

function handleParseExcelRows(data: { rawRows: any[][]; headerMap: Record<string, string> }) {
  const { rawRows, headerMap } = data;
  if (!Array.isArray(rawRows) || rawRows.length < 2) return [];

  const headerRow = rawRows[0] || [];
  const normalizedHeaders = headerRow.map((h: any) => String(h || '').trim());
  const dataRows = rawRows.slice(1);

  return dataRows.map(row => {
    const item: Record<string, any> = {};
    normalizedHeaders.forEach((header: string, index: number) => {
      const mappedKey = headerMap[header] || header;
      item[mappedKey] = row[index] !== undefined ? row[index] : null;
    });
    return item;
  });
}

function handleAggregateLedger(data: { entries: any[] }) {
  const { entries } = data;
  let totalDebit = 0;
  let totalCredit = 0;

  if (Array.isArray(entries)) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      totalDebit += Number(entry.debit || 0);
      totalCredit += Number(entry.credit || 0);
    }
  }

  return {
    totalDebit,
    totalCredit,
    balance: totalDebit - totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
  };
}

// Global worker message listener
self.onmessage = (e: MessageEvent<WorkerTaskMessage>) => {
  const { id, type, payload } = e.data;

  try {
    let result: any;

    switch (type) {
      case 'FILTER_DATASET':
        result = handleFilterDataset(payload);
        break;
      case 'CALCULATE_TOTALS':
        result = handleCalculateTotals(payload);
        break;
      case 'PARSE_EXCEL_ROWS':
        result = handleParseExcelRows(payload);
        break;
      case 'AGGREGATE_LEDGER':
        result = handleAggregateLedger(payload);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    self.postMessage({ id, success: true, result });
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || 'Worker processing error',
    });
  }
};
