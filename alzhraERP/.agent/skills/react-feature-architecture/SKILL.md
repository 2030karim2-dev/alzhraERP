---
name: react-feature-architecture
description: Ensures consistent feature-based React component architecture. Use when creating new features, refactoring components, or organizing folder structure in src/features/.
---

# React Feature Architecture Skill

Maintains consistent, scalable feature-based architecture for React/TypeScript ERP application.

## When to Use

- Creating new feature modules
- Refactoring existing components
- Organizing folder structure
- Implementing new pages or components
- Reviewing component architecture

## Folder Structure Convention

Every feature MUST follow this structure:

```
src/features/feature-name/
├── index.ts                    # Public API exports
├── FeatureNamePage.tsx         # Main page component
├── types.ts                    # Feature-specific types
├── schemas.ts                  # Zod validation schemas
├── api/                        # API calls (ONLY layer talking to Supabase)
│   ├── index.ts
│   └── featureApi.ts
├── components/                 # Feature components (UI only, NO Supabase clients here)
│   ├── ComponentName.tsx
│   └── subcomponents/
├── hooks/                      # Custom hooks (Call API layer, manage React Query state)
│   ├── index.ts
│   └── useFeature.ts
└── services/                   # Business logic (Pure functions, computations)
    ├── index.ts
    └── featureService.ts
```

## Component Standards

### File Naming
- Components: PascalCase (e.g., `InvoiceTable.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useInvoices.ts`)
- Utilities: camelCase (e.g., `invoiceHelpers.ts`)
- Types: camelCase (e.g., `invoiceTypes.ts`)

### Component Template

```tsx
// External imports first
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// Absolute imports
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

// Relative imports
import { useInvoices } from '../hooks/useInvoices';
import { InvoiceTable } from './InvoiceTable';
import type { Invoice } from '../types';

// Props interface
interface InvoiceListProps {
  customerId?: string;
  onSelect?: (invoice: Invoice) => void;
}

// Component
export function InvoiceList({ customerId, onSelect }: InvoiceListProps) {
  // Hooks at top
  const { data, isLoading } = useInvoices(customerId);
  const { toast } = useToast();
  
  // Local state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Callbacks
  const handleSelect = useCallback((invoice: Invoice) => {
    setSelectedId(invoice.id);
    onSelect?.(invoice);
  }, [onSelect]);
  
  // Render helpers
  if (isLoading) return <LoadingSpinner />;
  if (!data?.length) return <EmptyState />;
  
  // Return JSX
  return (
    <div className="space-y-4">
      {data.map(invoice => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          isSelected={invoice.id === selectedId}
          onSelect={() => handleSelect(invoice)}
        />
      ))}
    </div>
  );
}
```

## TypeScript Standards

### Props Interface Naming
- `{ComponentName}Props` for component props
- Use `interface` not `type` for object shapes
- Mark optional props with `?`
- Use `| null` not `undefined` for nullable values

### Type Exports
```typescript
// types.ts
export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  total: Decimal;
  status: InvoiceStatus;
  createdAt: string;
}

export type InvoiceStatus = 
  | 'draft' 
  | 'sent' 
  | 'paid' 
  | 'cancelled';

// Re-export from index.ts
export type { Invoice, InvoiceStatus } from './types';
```

## Hook Standards

### Data Fetching Hooks
```typescript
export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => fetchInvoices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Mutation Hooks
```typescript
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create invoice', 
        variant: 'destructive' 
      });
    },
  });
}
```

## Import Order

1. React and external libraries
2. Absolute imports (`@/components`, `@/hooks`)
3. Sibling feature imports
4. Relative imports within feature

## State Management

### Local State
- Use `useState` for UI state (modals, forms)
- Use `useReducer` for complex component state
- Lift state up only when necessary

### Server State
- Use React Query for all server data
- Define query keys consistently: `[entity, id, filters]`
- Use optimistic updates for better UX

### Global State
- Use Zustand for cross-feature state
- Keep stores minimal and focused
- Prefer composition over large stores

## Performance Guidelines

1. **Memoization**
   - Wrap expensive computations in `useMemo`
   - Wrap callbacks in `useCallback` when passed to children
   - Use `React.memo` for pure components receiving objects

2. **Code Splitting**
   - Use dynamic imports for heavy components
   - Split routes automatically

3. **List Rendering**
   - Always use `key` prop with stable IDs
   - Virtualize long lists

## Common Patterns

### Modal Pattern
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ isOpen, onClose, onConfirm }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* content */}
    </Dialog>
  );
}
```

### Form Pattern
```tsx
export function InvoiceForm({ initialData, onSubmit }: FormProps) {
  const form = useForm<InvoiceFormData>({
    defaultValues: initialData,
    resolver: zodResolver(invoiceSchema),
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* fields */}
      </form>
    </Form>
  );
}
```

## Anti-patterns to Avoid

1. ❌ Prop drilling more than 2 levels
2. ❌ `any` type usage
3. ❌ Inline function definitions in JSX (use `useCallback`)
4. ❌ Direct state mutations
5. ❌ Using index as React key
6. ❌ Large components (>200 lines) - extract subcomponents
7. ❌ Mixing UI and business logic - use services layer
8. ❌ **STRICT ERP RULE:** Importing or using `supabase` directly inside React Components. All DB calls MUST be fully wrapped inside the `api/` directory.
9. ❌ **STRICT ERP RULE:** Submitting data to the API without Zod schema validation first.
