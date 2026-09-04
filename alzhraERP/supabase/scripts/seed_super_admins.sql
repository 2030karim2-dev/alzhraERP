-- ==============================================================================
-- Script: seed_super_admins.sql
-- Purpose: بذر حسابات السوبر أدمن بعد أي نشر نظيف أو `supabase db reset`.
--
-- Why a script and not a migration?
--   الترحيلات تُطبق على كل البيئات؛ تثبيت عناوين بريد حقيقية داخلها يمنح أي بيئة
--   تتطابق فيها هذه الحسابات صلاحيات مطلقة تلقائياً. البذر قرار تشغيلي يُدار يدوياً.
--
-- Usage:
--   1) عدّل قائمة البريد أدناه.
--   2) psql "$SUPABASE_DB_URL" -f supabase/scripts/seed_super_admins.sql
--      أو الصق المحتوى في SQL Editor لمشروع Supabase (يعمل كـ postgres ويتجاوز RLS).
--
-- Idempotent: آمن للتشغيل المتكرر (ON CONFLICT DO NOTHING).
-- ==============================================================================

BEGIN;

INSERT INTO public.super_admins (user_id)
SELECT u.id
FROM auth.users u
WHERE u.email IN (
    'owner1@example.com',  -- ← ضع بريد مالك المنصة هنا
    'owner2@example.com'   -- ← ضع بريد المالك الثاني هنا (احذف السطر إن لم يوجد)
)
ON CONFLICT DO NOTHING;

COMMIT;

-- تحقق سريع بعد التنفيذ (يجب أن ترى صفوفاً مطابقة):
SELECT sa.user_id, u.email, sa.created_at
FROM public.super_admins sa
JOIN auth.users u ON u.id = sa.user_id
ORDER BY sa.created_at;
