-- Voisel Database Migration Script
-- Prefixing all tables with 'voisel_' to avoid conflicts with 'cashbook'

-- 1. Voisel Shops Table
CREATE TABLE IF NOT EXISTS public.voisel_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.voisel_shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own shops" ON public.voisel_shops;
CREATE POLICY "Users can manage their own shops"
ON public.voisel_shops
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 2. Voisel Products Table
CREATE TABLE IF NOT EXISTS public.voisel_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.voisel_shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  purchase_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.voisel_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage products in their shops" ON public.voisel_products;
CREATE POLICY "Users can manage products in their shops"
ON public.voisel_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.voisel_shops
    WHERE public.voisel_shops.id = public.voisel_products.shop_id
    AND public.voisel_shops.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.voisel_shops
    WHERE public.voisel_shops.id = public.voisel_products.shop_id
    AND public.voisel_shops.owner_id = auth.uid()
  )
);

-- 3. Voisel Stock Records Table
CREATE TABLE IF NOT EXISTS public.voisel_stock_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.voisel_products(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC NOT NULL,
  purchase_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.voisel_stock_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage stock records in their products" ON public.voisel_stock_records;
CREATE POLICY "Users can manage stock records in their products"
ON public.voisel_stock_records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.voisel_products
    JOIN public.voisel_shops ON public.voisel_shops.id = public.voisel_products.shop_id
    WHERE public.voisel_products.id = public.voisel_stock_records.product_id
    AND public.voisel_shops.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.voisel_products
    JOIN public.voisel_shops ON public.voisel_shops.id = public.voisel_products.shop_id
    WHERE public.voisel_products.id = public.voisel_stock_records.product_id
    AND public.voisel_shops.owner_id = auth.uid()
  )
);

-- 4. Voisel Sales Table
CREATE TABLE IF NOT EXISTS public.voisel_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.voisel_shops(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.voisel_products(id) ON DELETE CASCADE NOT NULL,
  quantity_sold NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  profit NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.voisel_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage sales in their shops" ON public.voisel_sales;
CREATE POLICY "Users can manage sales in their shops"
ON public.voisel_sales
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.voisel_shops
    WHERE public.voisel_shops.id = public.voisel_sales.shop_id
    AND public.voisel_shops.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.voisel_shops
    WHERE public.voisel_shops.id = public.voisel_sales.shop_id
    AND public.voisel_shops.owner_id = auth.uid()
  )
);

-- 5. Triggers to Auto-Sync Stock Level on Stock Records Added/Updated/Deleted
CREATE OR REPLACE FUNCTION update_product_stock_on_add()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.voisel_products
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.voisel_products
    SET quantity = quantity + (NEW.quantity - OLD.quantity)
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.voisel_products
    SET quantity = quantity - OLD.quantity
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_stock_on_add ON public.voisel_stock_records;
CREATE TRIGGER tr_update_stock_on_add
AFTER INSERT OR UPDATE OR DELETE ON public.voisel_stock_records
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_add();

-- 6. Triggers to Auto-Sync Stock Level on Sales Added/Updated/Deleted
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.voisel_products
    SET quantity = quantity - NEW.quantity_sold
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.voisel_products
    SET quantity = quantity - (NEW.quantity_sold - OLD.quantity_sold)
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.voisel_products
    SET quantity = quantity + OLD.quantity_sold
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_stock_on_sale ON public.voisel_sales;
CREATE TRIGGER tr_update_stock_on_sale
AFTER INSERT OR UPDATE OR DELETE ON public.voisel_sales
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_on_sale();
