CREATE TABLE public.look_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  note text NOT NULL DEFAULT '',
  occasion text NOT NULL,
  style text NOT NULL,
  pieces jsonb NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT look_favorites_pieces_array CHECK (jsonb_typeof(pieces) = 'array' AND jsonb_array_length(pieces) > 0)
);
GRANT SELECT, INSERT, DELETE ON public.look_favorites TO authenticated;
GRANT ALL ON public.look_favorites TO service_role;
ALTER TABLE public.look_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY look_favorites_owner_select ON public.look_favorites FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = look_favorites.store_id AND s.owner_id = auth.uid()));
CREATE POLICY look_favorites_owner_insert ON public.look_favorites FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = look_favorites.store_id AND s.owner_id = auth.uid()));
CREATE POLICY look_favorites_owner_delete ON public.look_favorites FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = look_favorites.store_id AND s.owner_id = auth.uid()));