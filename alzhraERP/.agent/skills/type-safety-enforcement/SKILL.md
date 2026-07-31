---
name: type-safety-enforcement
description: Ensures TypeScript type safety across the application, prevents type errors, and maintains consistency between types and implementation. Use when writing TypeScript code, fixing type errors, or reviewing type definitions.
---

# Type Safety Enforcement Skill

Maintains strict TypeScript type safety and prevents runtime errors through comprehensive typing.

## When to Use

- Writing new TypeScript code
- Fixing TypeScript compilation errors
- Reviewing type definitions
- Refactoring existing code
- Syncing types with database schema

## Core Principles

1. **Strict Mode**: All code must pass strict TypeScript checks
2. **No Implicit Any**: Never use implicit or explicit `any`
3. **Exhaustive Checks**: Handle all cases in unions and enums
4. **Null Safety**: Properly handle nullable values
5. **STRICT ERP RULE**: Bypassing type safety using `as any` is strictly forbidden, especially for Supabase queries. If the generated types don't match, fix the database schema and regenerate the types via Supabase CLI.

## Type Definition Standards

### Interface vs Type
```typescript
// Use interface for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for unions, tuples, aliases
type Status = 'active' | 'inactive' | 'pending';
type ID = string | number;
```

### Naming Conventions
```typescript
// PascalCase for types and interfaces
interface InvoiceItem { }
type PaymentMethod = 'cash' | 'card';

// Prefix with I only for interfaces that conflict with classes
interface IUser { }  // Avoid if possible

// Suffix types with their purpose
type InvoiceFormData  // Form data
type InvoiceDTO       // Data transfer object
type InvoiceEntity    // Database entity
```

### Strict Optional Properties
```typescript
// ❌ Bad - undefined can be confused with missing
interface Bad {
  name?: string | undefined;
}

// ✅ Good - optional means might be undefined
interface Good {
  name?: string;
}

// ✅ Good - explicit null for intentionally empty
interface Better {
  name: string | null;
}
```

### Database Type Sync

All types must match Supabase schema:

```typescript
// From database.types.ts
export interface Database {
  public: {
    Tables: {
      invoices: {
        Row: {
          id: string;
          total: number;  // numeric in DB
          created_at: string;  // timestamptz
        };
      };
    };
  };
}

// Domain type
type Invoice = Database['public']['Tables']['invoices']['Row'];

// Form type (partial, with transformations)
interface InvoiceFormData {
  customerId: string;
  items: InvoiceItemFormData[];
  // Note: total is computed, not in form
}
```

## Utility Types Usage

### Common Patterns
```typescript
// Make all properties optional
Partial<User>

// Pick specific properties
Pick<User, 'id' | 'name'>

// Omit specific properties
Omit<User, 'password' | 'internalNotes'>

// Make all properties required
Required<FormData>

// Readonly version
Readonly<Config>

// Extract return type
type APIResponse = Awaited<ReturnType<typeof fetchUser>>;

// Extract parameter type
type FetchOptions = Parameters<typeof fetchUser>[0];
```

### Custom Utility Types
```typescript
// Nullable type
type Nullable<T> = T | null;

// Optional type
type Optional<T> = T | undefined;

// With ID
type WithId<T> = T & { id: string };

// API Response wrapper
type APIResponse<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: Error;
};
```

## Function Type Safety

### Explicit Return Types
```typescript
// ✅ Good - explicit return type
function calculateTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

// ❌ Bad - inferred (may change unexpectedly)
function calculateTotal(items: InvoiceItem[]) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
```

### Proper Error Handling
```typescript
// ✅ Good - Result type for errors
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return { success: false, error: new Error(error.message) };
    }
    
    if (!data) {
      return { success: false, error: new Error('User not found') };
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Enum Alternatives

Prefer string literal unions over enums:

```typescript
// ❌ Bad - enums
enum InvoiceStatus {
  Draft = 'draft',
  Sent = 'sent',
  Paid = 'paid',
}

// ✅ Good - const assertion
const InvoiceStatus = {
  Draft: 'draft',
  Sent: 'sent',
  Paid: 'paid',
} as const;

type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

// ✅ Also good - simple union
type InvoiceStatus = 'draft' | 'sent' | 'paid';
```

## Type Guards

```typescript
// Type guard function
function isInvoice(item: unknown): item is Invoice {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'total' in item &&
    typeof (item as Invoice).id === 'string' &&
    typeof (item as Invoice).total === 'number'
  );
}

// Usage
if (isInvoice(data)) {
  // data is typed as Invoice here
  console.log(data.total);
}

// Discriminated unions
interface SuccessResult {
  type: 'success';
  data: User;
}

interface ErrorResult {
  type: 'error';
  error: string;
}

type Result = SuccessResult | ErrorResult;

function handleResult(result: Result) {
  switch (result.type) {
    case 'success':
      // result.data is User
      return result.data;
    case 'error':
      // result.error is string
      throw new Error(result.error);
    default:
      // Exhaustiveness check
      const _exhaustive: never = result;
      return _exhaustive;
  }
}
```

## Generic Patterns

```typescript
// Generic hook
function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetcher()
      .then(setData)
      .finally(() => setLoading(false));
  }, deps);
  
  return { data, loading };
}

// Generic with constraints
interface Entity {
  id: string;
}

function findById<T extends Entity>(
  items: T[],
  id: string
): T | undefined {
  return items.find(item => item.id === id);
}
```

## Supabase Type Safety

```typescript
// Properly typed Supabase client
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/core/database.types';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Typed query
const { data, error } = await supabase
  .from('invoices')
  .select(`
    *,
    customer:customers(*),
    items:invoice_items(*)
  `)
  .eq('status', 'paid')
  .returns<InvoiceWithRelations[]>();  // Explicit return type
```

## Common TypeScript Errors

### TS2532: Object is possibly 'undefined'
```typescript
// ❌ Bad
const name = user.profile.name;

// ✅ Good - optional chaining
const name = user.profile?.name;

// ✅ Good - nullish coalescing
const name = user.profile?.name ?? 'Anonymous';

// ✅ Good - type guard
if (user.profile) {
  const name = user.profile.name;  // profile is defined here
}
```

### TS2345: Argument of type X is not assignable to Y
```typescript
// Check that types are compatible
// May need explicit type assertion (use sparingly)
const value = unknownValue as string;

// Or better, type guard
if (typeof unknownValue === 'string') {
  // unknownValue is string here
}
```

### TS2322: Type X is not assignable to type Y
```typescript
// Check object shapes match
// Missing properties or wrong types

// Use satisfies operator for better inference
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} satisfies Config;
```

## Anti-patterns to Avoid

1. ❌ `any` type
2. ❌ `@ts-ignore` or `@ts-expect-error` without explanation
3. ❌ Type assertions without guards (`as Type`)
4. ❌ **STRICT ERP RULE**: Casting Supabase returns (`.from('table').select() as any`). Rely solely on `database.types.ts`.
5. ❌ Non-null assertions (`!`)
6. ❌ Implicit any in callbacks
7. ❌ Missing return types on exported functions
8. ❌ Using `Object` or `{}` as types
