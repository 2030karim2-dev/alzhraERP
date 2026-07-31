
#!/bin/bash

echo "🚀 Starting Al-Zahra Smart ERP Cleanup Protocol v2.1..."

# 1. Remove Root Level Legacy Directories
echo "📦 Removing legacy root directories..."
rm -rf src/components
rm -rf src/pages
rm -rf src/hooks
rm -rf src/services
rm -rf src/types
rm -rf src/data

# 2. Remove Root Level Legacy Files
echo "📄 Removing legacy root files..."
rm -f src/types.ts
rm -f src/constants.tsx
rm -f index.tsx

# 3. Clean up Feature Redundancies & Deprecated Logic
echo "🧹 Cleaning Feature Redundancies..."
rm -rf src/features/sales/views
rm -rf src/features/sales/hooks/useSalesSeed.ts
rm -f src/features/sales/seed.ts
rm -rf src/features/inventory/hooks/useProductSearch.ts
rm -f src/features/inventory/components/ProductCardView.tsx
rm -rf src/features/parties/hooks/usePartiesData.ts
rm -rf src/features/customers/hooks/useCustomersData.ts
rm -rf src/features/suppliers/hooks/useSuppliersData.ts
rm -rf src/features/settings/hooks/useSettings.ts
rm -rf src/features/settings/api/companyApi.ts
rm -rf src/features/settings/services/settingsService.ts
rm -rf src/features/settings/types/index.ts
rm -f src/features/accounting/types.ts
rm -f src/features/dashboard/components/StatCard.tsx
rm -f src/features/dashboard/components/CategoriesChart.tsx
rm -f src/features/dashboard/components/TopCustomersTable.tsx
rm -f src/features/appearance/store.ts
rm -f src/features/appearance/components/AppearanceTabs.tsx

# 4. Remove Deprecated Core/Lib Files (Replaced by DB Logic or New Architecture)
echo "🗑️ Removing Deprecated Core Files..."
rm -f src/lib/localDB.ts
rm -f src/core/usecases/accounting/AutoFinancialLinker.ts
rm -f src/features/auth/LoginPage.tsx

# 5. Clean up Legacy SQL Files
echo "🗄️  Cleaning Legacy SQL Files..."
rm -f supabase/full_schema.sql
rm -f supabase/backend_logic.sql
rm -f supabase/auth_triggers.sql
rm -f supabase/storage.sql

echo "✨ Cleanup Complete! System is now compliant with Clean Architecture v2.0"
