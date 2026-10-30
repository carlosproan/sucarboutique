CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,
  category TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'Unico',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX stock_items_store_id_idx ON public.stock_items (store_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_items_owner_select
  ON public.stock_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = stock_items.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY stock_items_owner_insert
  ON public.stock_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = stock_items.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY stock_items_owner_update
  ON public.stock_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = stock_items.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = stock_items.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY stock_items_owner_delete
  ON public.stock_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = stock_items.store_id AND s.owner_id = auth.uid()
    )
  );

-- Fotos do stock: bucket privado, cada loja só acede à sua pasta (primeira pasta = id da loja).
CREATE POLICY stock_photos_owner_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'stock-photos'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY stock_photos_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'stock-photos'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY stock_photos_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'stock-photos'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()
    )
  );