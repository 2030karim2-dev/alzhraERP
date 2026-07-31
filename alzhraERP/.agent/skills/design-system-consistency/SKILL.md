---
name: design-system-consistency
description: Ensures consistent UI/UX across the application following the design system. Use when implementing new UI components, styling pages, or reviewing visual consistency.
---

# Design System Consistency Skill

Maintains visual consistency and professional appearance across the ERP application.

## When to Use

- Creating new UI components
- Styling pages and features
- Reviewing visual consistency
- Implementing responsive designs
- Adding animations or effects

## Design Tokens Reference

### Colors
Always use CSS variables from design system:
```css
/* Primary */
var(--primary)           /* Main brand color */
var(--primary-foreground) /* Text on primary */

/* Backgrounds */
var(--background)        /* Page background */
var(--foreground)        /* Main text color */
var(--card)              /* Card backgrounds */
var(--card-foreground)   /* Text on cards */

/* Borders */
var(--border)            /* Default borders */
var(--input)             /* Input borders */
var(--ring)              /* Focus rings */

/* Semantic */
var(--destructive)       /* Error/danger */
var(--success)           /* Success states */
var(--warning)           /* Warning states */
var(--info)              /* Info states */
```

### Spacing Scale
```
0.5  - 2px   (xs)
1    - 4px   (sm)
2    - 8px   (md)
3    - 12px  (lg)
4    - 16px  (xl)
6    - 24px  (2xl)
8    - 32px  (3xl)
```

### Border Radius
```
rounded-sm   - 2px
rounded      - 4px
rounded-md   - 6px
rounded-lg   - 8px
rounded-xl   - 12px
rounded-2xl  - 16px
```

## Component Patterns

### Card Pattern
```tsx
<div className="rounded-lg border bg-card p-6 shadow-sm">
  <h3 className="text-lg font-semibold text-card-foreground">
    Card Title
  </h3>
  <p className="mt-2 text-sm text-muted-foreground">
    Card description
  </p>
</div>
```

### Form Input Pattern
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    placeholder="Enter email"
    className="h-10"
  />
  <p className="text-xs text-muted-foreground">
    Helper text
  </p>
</div>
```

### Button Hierarchy
```tsx
{/* Primary action */}
<Button>Save Changes</Button>

{/* Secondary action */}
<Button variant="outline">Cancel</Button>

{/* Destructive action */}
<Button variant="destructive">Delete</Button>

{/* Ghost/Link action */}
<Button variant="ghost">Learn More</Button>
```

### Data Table Pattern
```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader className="bg-muted/50">
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead className="text-right">Amount</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map(item => (
        <TableRow key={item.id} className="hover:bg-muted/50">
          <TableCell>{item.name}</TableCell>
          <TableCell className="text-right">
            {formatCurrency(item.amount)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## Responsive Breakpoints

```
sm: 640px   - Mobile landscape
md: 768px   - Tablet
lg: 1024px  - Desktop
xl: 1280px  - Large desktop
2xl: 1536px - Extra large
```

### Common Responsive Patterns
```tsx
{/* Stack on mobile, row on desktop */}
<div className="flex flex-col gap-4 md:flex-row">

{/* Full width mobile, constrained desktop */}
<div className="w-full max-w-4xl mx-auto">

{/* Hide on mobile */}
<div className="hidden md:block">

{/* Grid responsive */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Typography Scale

```
text-xs    - 12px - Captions, badges
text-sm    - 14px - Body small, buttons
text-base  - 16px - Body default
text-lg    - 18px - Section headings
text-xl    - 20px - Page subheadings
text-2xl   - 24px - Page titles
text-3xl   - 30px - Large titles
```

## Spacing Guidelines

### Section Spacing
```
Page padding: p-6 (24px)
Section gap: space-y-6 (24px)
Card internal: p-6 (24px)
Form fields: space-y-4 (16px)
Related items: gap-4 (16px)
```

## Visual Hierarchy

### Page Structure
```
Page
├── Header (border-b, pb-4)
│   ├── Breadcrumbs (text-sm, text-muted-foreground)
│   └── Title + Actions
├── Content (space-y-6)
│   ├── Stats Cards (grid)
│   ├── Main Content (card)
│   └── Sidebar (if applicable)
└── Footer (if needed)
```

## Animation Guidelines

### Standard Transitions
```css
/* Default transition */
transition-colors duration-200

/* Hover effects */
transition-all duration-200 hover:shadow-md

/* Modal/Dialog */
animate-in fade-in zoom-in-95 duration-200

/* Slide in */
animate-in slide-in-from-bottom-4 duration-300
```

### Loading States
```tsx
{/* Skeleton loading */}
<Skeleton className="h-4 w-[200px]" />

{/* Spinner */}
<Loader2 className="h-4 w-4 animate-spin" />

{/* Button loading */}
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Saving...
</Button>
```

## Accessibility Requirements

1. **Color Contrast**
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text

2. **Focus Indicators**
   - All interactive elements must have visible focus
   - Use `focus-visible:ring-2 focus-visible:ring-ring`

3. **Touch Targets**
   - Minimum 44x44px for touch devices
   - Buttons should be at least h-10 (40px) with spacing

## RTL Support (Arabic)

```tsx
{/* Always use logical properties */}
<div className="ps-4">  /* padding-start */
<div className="me-2">  /* margin-end */
<div className="text-start">  /* text-align: start */
<div className="border-s">   /* border-start */

{/* Icons that need flipping */}
<ArrowRight className="rtl:rotate-180" />
<ChevronLeft className="rtl:rotate-180" />
```

## Anti-patterns to Avoid

1. ❌ Hardcoded colors (use CSS variables)
2. ❌ Arbitrary values (e.g., `w-[123px]`)
3. ❌ Missing hover states on interactive elements
4. ❌ Inconsistent spacing (mixing 16px, 18px, 20px)
5. ❌ Text without sufficient contrast
6. ❌ Missing loading states for async operations
7. ❌ Content jumping during loading
