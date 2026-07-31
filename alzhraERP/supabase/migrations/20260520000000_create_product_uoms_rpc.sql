-- 1. إنشاء جدول وحدات القياس للمنتجات (product_uoms) في حال عدم وجوده
CREATE TABLE IF NOT EXISTS public.product_uoms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    uom_name text NOT NULL,
    conversion_factor numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- تفعيل RLS (Row Level Security) على الجدول
ALTER TABLE public.product_uoms ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة تسمح لجميع المستخدمين المسجلين بالقراءة والكتابة (مطابقة لجدول المنتجات)
CREATE POLICY "Allow all actions for authenticated users" ON public.product_uoms
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. دالة تحديث وحدات قياس المنتجات بشكل ذري (Atomic Transaction RPC)
CREATE OR REPLACE FUNCTION public.save_product_uoms(
    p_product_id uuid,
    p_uoms jsonb
)
RETURNS void AS $$
DECLARE
    v_uom jsonb;
BEGIN
    -- أ) حذف جميع وحدات القياس الحالية للمنتج
    DELETE FROM public.product_uoms WHERE product_id = p_product_id;
    
    -- ب) إدخال الوحدات الجديدة إذا تم تمريرها
    IF p_uoms IS NOT NULL AND jsonb_array_length(p_uoms) > 0 THEN
        FOR v_uom IN SELECT * FROM jsonb_array_elements(p_uoms) LOOP
            INSERT INTO public.product_uoms (product_id, uom_name, conversion_factor)
            VALUES (
                p_product_id,
                (v_uom->>'uom_name')::text,
                (v_uom->>'conversion_factor')::numeric
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
