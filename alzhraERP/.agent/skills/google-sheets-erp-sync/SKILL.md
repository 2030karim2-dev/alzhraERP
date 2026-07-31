---
description: Standards for syncing ERP data to Google Sheets with professional Arabic formatting
---

# Google Sheets ERP Sync Skill

Ensures professional, organized, and Arabic-translated synchronization between Supabase and Google Sheets for all ERP modules.

## Architecture

```
Supabase DB (INSERT/UPDATE) → pg_net webhook → Google Apps Script → Google Sheets
```

### Key Components
1. **Supabase Trigger** (`send_webhook_event`): Fires on INSERT/UPDATE for products, parties, invoices, payments, expenses
2. **Google Apps Script** (`doPost`): Receives JSON payload, formats data, writes to correct sheet
3. **Google Sheets**: 5 color-coded tabs matching the ERP modules

## Core Standards

### 1. Visual Design
- **RTL:** All sheets must use `sheet.setRightToLeft(true)`
- **Headers:** Colored background per module, white bold text, Cairo font, frozen row 1, height 42px
- **Rows:** Zebra striping (alternating even/odd colors), centered text, borders, height 32px
- **Columns:** Auto-resize with +20px padding, minimum width 90px

### 2. Module Color Palette
| Module | Header BG | Even Row |
|--------|-----------|----------|
| المنتجات | `#1D4ED8` | `#EFF6FF` |
| العملاء والموردين | `#059669` | `#ECFDF5` |
| الفواتير | `#7C3AED` | `#F5F3FF` |
| السندات | `#D97706` | `#FFFBEB` |
| المصروفات | `#DC2626` | `#FEF2F2` |

### 3. Arabic Localization
- **Column Headers:** Every field must have an Arabic alias (defined in `TABLE_COLUMNS`)
- **Enum Values:** Status, type, and payment method values must be translated with emojis (defined in `ENUM_AR`)
- **Booleans:** `true` → `✅ نعم`, `false` → `❌ لا`
- **Dates:** Format as `YYYY-MM-DD`

### 4. Data Organization
- **Strict Column Order:** Each table has a fixed column definition array. Important fields first (Name, Number, Amount), metadata last
- **Hidden ID Column:** The record `id` is stored in a hidden column (last+1) for upsert logic
- **Blacklisted Fields:** `company_id`, `updated_at`, `deleted_at`, `created_by`, `created_at`, `image_url`, `category_id` are never shown

## Deployment Workflow
1. Replace code in Google Apps Script editor with latest version
2. **Deploy → New Deployment** → Copy new `/exec` URL
3. Update `send_webhook_event` function in Supabase with the new URL (via SQL Editor or MCP)
4. Trigger bulk update: `UPDATE products SET updated_at = now() WHERE company_id = '...'` (repeat for each table)

## Verification Checklist
- [ ] Sheet is RTL
- [ ] Headers are Arabic with correct module color
- [ ] Important columns appear first (Name/Number/Amount)
- [ ] Enum values show Arabic labels with emojis
- [ ] Hidden ID column exists for upsert
- [ ] Version note appears when clicking `🚀 نظام المزامنة → التحقق من الإصدار`
