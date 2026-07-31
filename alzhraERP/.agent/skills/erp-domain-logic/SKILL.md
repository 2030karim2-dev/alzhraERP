---
name: erp-domain-logic
description: Ensures correct ERP business logic implementation including accounting, inventory, invoicing, and financial calculations. Use when implementing business features, validating calculations, or reviewing domain logic.
---

# ERP Domain Logic Skill

Maintains correct business logic for ERP operations including accounting principles, inventory management, and financial calculations.

## When to Use

- Implementing accounting features
- Working with inventory/stock movements
- Creating invoices or financial documents
- Calculating totals, taxes, or balances
- Reviewing business logic correctness

## Accounting Principles

### Double Entry System
Every transaction must have equal debits and credits:

```typescript
interface JournalEntry {
  date: string;
  description: string;
  lines: JournalLine[];
}

interface JournalLine {
  accountId: string;
  debit: Decimal;
  credit: Decimal;
}

// Validation
function validateJournalEntry(entry: JournalEntry): boolean {
  const totalDebits = entry.lines.reduce(
    (sum, line) => sum.plus(line.debit), 
    new Decimal(0)
  );
  const totalCredits = entry.lines.reduce(
    (sum, line) => sum.plus(line.credit), 
    new Decimal(0)
  );
  
  return totalDebits.equals(totalCredits);
}

// ⚠️ ERP ARCHITECTURE RULE: 
// Complex journal entries affecting multiple tables (e.g. Invoicing + Inventory + Journal) 
// MUST be executed inside a single PostgreSQL Transaction (via RPC function) to prevent partial failures.
// NEVER execute sequential API calls from the client for atomic financial operations.
```

### Account Types

```typescript
type AccountType = 
  | 'asset'      // Dr increases, Cr decreases
  | 'liability'  // Cr increases, Dr decreases
  | 'equity'     // Cr increases, Dr decreases
  | 'revenue'    // Cr increases, Dr decreases
  | 'expense';   // Dr increases, Cr decreases

function getAccountNormalBalance(type: AccountType): 'debit' | 'credit' {
  const normalBalances: Record<AccountType, 'debit' | 'credit'> = {
    asset: 'debit',
    expense: 'debit',
    liability: 'credit',
    equity: 'credit',
    revenue: 'credit',
  };
  return normalBalances[type];
}
```

### Chart of Accounts Structure

```
1xxx - Assets
  11xx - Current Assets
    1101 - Cash
    1102 - Bank
    1103 - Accounts Receivable
    1104 - Inventory
  12xx - Fixed Assets

2xxx - Liabilities
  21xx - Current Liabilities
    2101 - Accounts Payable
    2102 - Short-term Loans

3xxx - Equity
  3101 - Capital
  3102 - Retained Earnings

4xxx - Revenue
  4101 - Sales Revenue
  4102 - Service Revenue

5xxx - Expenses
  5101 - Cost of Goods Sold
  5102 - Operating Expenses
```

## Financial Calculations

### Decimal Precision
Always use `Decimal` for money calculations:

```typescript
import Decimal from 'decimal.js';

// ✅ Good
const subtotal = items.reduce(
  (sum, item) => sum.plus(item.price.times(item.quantity)),
  new Decimal(0)
);

const tax = subtotal.times(taxRate);
const total = subtotal.plus(tax);

// ❌ Bad - floating point errors
const total = items.reduce(
  (sum, item) => sum + (item.price * item.quantity),
  0
);
```

### Tax Calculation

```typescript
interface TaxCalculation {
  subtotal: Decimal;
  taxAmount: Decimal;
  total: Decimal;
}

function calculateTax(
  amount: Decimal,
  rate: number,
  inclusive: boolean
): TaxCalculation {
  if (inclusive) {
    // Tax included in price
    const taxAmount = amount.times(rate).dividedBy(1 + rate);
    const subtotal = amount.minus(taxAmount);
    return {
      subtotal,
      taxAmount,
      total: amount,
    };
  } else {
    // Tax added to price
    const taxAmount = amount.times(rate);
    return {
      subtotal: amount,
      taxAmount,
      total: amount.plus(taxAmount),
    };
  }
}
```

### Invoice Line Calculations

```typescript
interface InvoiceLine {
  productId: string;
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  discountPercent?: Decimal;
  discountAmount?: Decimal;
  taxRate: Decimal;
}

function calculateLineTotal(line: InvoiceLine) {
  const baseAmount = line.quantity.times(line.unitPrice);
  
  // Apply discount
  let discountAmount = new Decimal(0);
  if (line.discountPercent && line.discountPercent.greaterThan(0)) {
    discountAmount = baseAmount.times(line.discountPercent.dividedBy(100));
  } else if (line.discountAmount) {
    discountAmount = line.discountAmount;
  }
  
  const netAmount = baseAmount.minus(discountAmount);
  const taxAmount = netAmount.times(line.taxRate.dividedBy(100));
  const total = netAmount.plus(taxAmount);
  
  return {
    baseAmount,
    discountAmount,
    netAmount,
    taxAmount,
    total,
  };
}
```

## Inventory Management

### Stock Movement Types

```typescript
type StockMovementType =
  | 'purchase'      // Increase stock
  | 'purchase_return' // Decrease stock
  | 'sale'          // Decrease stock
  | 'sale_return'   // Increase stock
  | 'adjustment'    // +/- stock
  | 'transfer_in'   // Increase stock
  | 'transfer_out'; // Decrease stock

interface StockMovement {
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: Decimal;
  unitCost: Decimal;
  reference: string;
  date: string;
}
```

### FIFO Cost Calculation

```typescript
interface StockBatch {
  quantity: Decimal;
  unitCost: Decimal;
  date: string;
}

function calculateCOGS(
  batches: StockBatch[],
  quantitySold: Decimal
): { cogs: Decimal; remainingBatches: StockBatch[] } {
  let remainingToSell = quantitySold;
  let cogs = new Decimal(0);
  const remainingBatches: StockBatch[] = [];
  
  for (const batch of batches) {
    if (remainingToSell.lessThanOrEqualTo(0)) {
      remainingBatches.push(batch);
      continue;
    }
    
    const quantityFromBatch = Decimal.min(remainingToSell, batch.quantity);
    cogs = cogs.plus(quantityFromBatch.times(batch.unitCost));
    remainingToSell = remainingToSell.minus(quantityFromBatch);
    
    if (batch.quantity.greaterThan(quantityFromBatch)) {
      remainingBatches.push({
        ...batch,
        quantity: batch.quantity.minus(quantityFromBatch),
      });
    }
  }
  
  if (remainingToSell.greaterThan(0)) {
    throw new Error('Insufficient stock');
  }
  
  return { cogs, remainingBatches };
}
```

## Customer/Supplier Logic

### Balance Calculations

```typescript
interface CustomerBalance {
  customerId: string;
  totalInvoiced: Decimal;
  totalPaid: Decimal;
  totalCredits: Decimal;
  balanceDue: Decimal;
}

function calculateCustomerBalance(
  invoices: Invoice[],
  payments: Payment[],
  creditNotes: CreditNote[]
): CustomerBalance {
  const totalInvoiced = invoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum.plus(inv.total), new Decimal(0));
  
  const totalPaid = payments
    .reduce((sum, pay) => sum.plus(pay.amount), new Decimal(0));
  
  const totalCredits = creditNotes
    .filter(cn => cn.status === 'applied')
    .reduce((sum, cn) => sum.plus(cn.amount), new Decimal(0));
  
  const balanceDue = totalInvoiced
    .minus(totalPaid)
    .minus(totalCredits);
  
  return {
    totalInvoiced,
    totalPaid,
    totalCredits,
    balanceDue,
  };
}
```

## Multi-Currency Handling

```typescript
interface CurrencyAmount {
  amount: Decimal;
  currency: string;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: Decimal;
  date: string;
}

function convertCurrency(
  amount: CurrencyAmount,
  targetCurrency: string,
  exchangeRate: ExchangeRate
): CurrencyAmount {
  if (amount.currency === targetCurrency) {
    return amount;
  }
  
  if (exchangeRate.from !== amount.currency || 
      exchangeRate.to !== targetCurrency) {
    throw new Error('Invalid exchange rate');
  }
  
  return {
    amount: amount.amount.times(exchangeRate.rate),
    currency: targetCurrency,
  };
}

// Exchange difference calculation
function calculateExchangeDifference(
  originalAmount: CurrencyAmount,
  currentRate: ExchangeRate
): Decimal {
  const convertedNow = convertCurrency(
    originalAmount,
    currentRate.to,
    currentRate
  );
  // Compare with original converted value
  // ...
}
```

## Validation Rules

### Invoice Validation

```typescript
function validateInvoice(invoice: Invoice): string[] {
  const errors: string[] = [];
  
  // Required fields
  if (!invoice.customerId) {
    errors.push('Customer is required');
  }
  
  // Date not in future
  if (new Date(invoice.date) > new Date()) {
    errors.push('Invoice date cannot be in the future');
  }
  
  // At least one line item
  if (invoice.lines.length === 0) {
    errors.push('Invoice must have at least one line item');
  }
  
  // Positive quantities and prices
  for (const line of invoice.lines) {
    if (line.quantity.lessThanOrEqualTo(0)) {
      errors.push(`Line ${line.id}: Quantity must be positive`);
    }
    if (line.unitPrice.lessThan(0)) {
      errors.push(`Line ${line.id}: Price cannot be negative`);
    }
  }
  
  // Totals match
  const calculatedTotal = invoice.lines.reduce(
    (sum, line) => sum.plus(calculateLineTotal(line).total),
    new Decimal(0)
  );
  
  if (!calculatedTotal.equals(invoice.total)) {
    errors.push('Invoice total does not match line items');
  }
  
  return errors;
}
```

## Common Business Rules

### Payment Terms
```typescript
interface PaymentTerms {
  days: number;
  discountPercent?: number;
  discountDays?: number;
}

function calculateDueDate(
  invoiceDate: Date,
  terms: PaymentTerms
): Date {
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + terms.days);
  return dueDate;
}

function isOverdue(
  dueDate: Date,
  gracePeriodDays: number = 0
): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - gracePeriodDays);
  return dueDate < cutoff;
}
```

## Anti-patterns to Avoid

1. ❌ Using floating point for money (use Decimal)
2. ❌ Rounding intermediate calculations (round only final results)
3. ❌ Hardcoding tax rates or exchange rates
4. ❌ Allowing negative inventory without explicit backorder handling
5. ❌ Modifying posted journal entries (create reversal instead)
6. ❌ Deleting invoices (use status changes: draft → cancelled)
7. ❌ Storing calculated totals without validation
8. ❌ **Executing multi-step financial operations sequentially from the client.** (Always use Backend RPC Transactions for atomic operations).
