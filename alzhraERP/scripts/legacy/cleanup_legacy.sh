
#!/bin/bash

# Define legacy directories and files to be removed
LEGACY_PATHS=(
  "components"
  "pages"
  "hooks"
  "services"
  "data"
  "types"
  "types.ts"
  "constants.tsx"
  "features/sales/views"
  "features/sales/seed.ts"
  "features/accounting/types.ts"
  "features/accounting/api.ts"
  "features/accounting/service.ts"
  "features/accounting/hooks.ts"
  "features/appearance/store.ts"
  "features/appearance/components/AppearanceTabs.tsx"
  "features/dashboard/components/StatCard.tsx"
  "features/dashboard/components/CategoriesChart.tsx"
  "features/dashboard/components/TopCustomersTable.tsx"
)

echo "🧹 Starting Project Cleanup..."

for path in "${LEGACY_PATHS[@]}"; do
  if [ -e "$path" ]; then
    rm -rf "$path"
    echo "✅ Removed: $path"
  else
    echo "⚠️  Skipped (Not Found): $path"
  fi
done

echo "✨ Cleanup Complete! Your project is now strictly following the new Clean Architecture."
