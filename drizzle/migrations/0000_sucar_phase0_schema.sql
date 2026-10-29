-- FASE 0 — SUCAR Boutique: schema base

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  name text not null,
  logo_url text,
  instagram text,
  whatsapp text not null,
  city text not null default 'Luanda',
  currency text not null default 'Kz',
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monthly_photo_limit int not null,
  monthly_look_limit int not null,
  monthly_tryon_limit int not null
);

create table public.store_plans (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  started_at timestamptz not null default now()
);

create table public.usage (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  photos_processed int not null default 0,
  items_created int not null default 0,
  looks_generated int not null default 0,
  tryons_done int not null default 0,
  unique (store_id, month)
);

-- Plano Grátis (valores editáveis na tabela)
insert into public.plans (name, monthly_photo_limit, monthly_look_limit, monthly_tryon_limit)
values ('Grátis', 20, 30, 10);

-- GRANTs (a Data API não concede por omissão)
grant select, insert, update, delete on public.stores to authenticated;
grant all on public.stores to service_role;
grant select on public.plans to authenticated;
grant all on public.plans to service_role;
grant select, insert, delete on public.store_plans to authenticated;
grant all on public.store_plans to service_role;
grant select, insert, update, delete on public.usage to authenticated;
grant all on public.usage to service_role;

-- RLS
alter table public.stores enable row level security;
alter table public.plans enable row level security;
alter table public.store_plans enable row level security;
alter table public.usage enable row level security;

create policy "Dona lê e escreve a sua loja"
  on public.stores for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Planos legíveis por autenticados"
  on public.plans for select
  to authenticated
  using (true);

create policy "Dona lê os planos da sua loja"
  on public.store_plans for select
  to authenticated
  using (exists (
    select 1 from public.stores s
    where s.id = store_plans.store_id and s.owner_id = auth.uid()
  ));

create policy "Dona atribui plano à sua loja"
  on public.store_plans for insert
  to authenticated
  with check (exists (
    select 1 from public.stores s
    where s.id = store_plans.store_id and s.owner_id = auth.uid()
  ));

create policy "Dona lê o consumo da sua loja"
  on public.usage for select
  to authenticated
  using (exists (
    select 1 from public.stores s
    where s.id = usage.store_id and s.owner_id = auth.uid()
  ));

create policy "Dona regista consumo da sua loja"
  on public.usage for insert
  to authenticated
  with check (exists (
    select 1 from public.stores s
    where s.id = usage.store_id and s.owner_id = auth.uid()
  ));

create policy "Dona atualiza consumo da sua loja"
  on public.usage for update
  to authenticated
  using (exists (
    select 1 from public.stores s
    where s.id = usage.store_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.stores s
    where s.id = usage.store_id and s.owner_id = auth.uid()
  ));

-- Storage: bucket privado "logos", cada dona só escreve/lê a sua pasta
create policy "Dona envia o logótipo da sua loja"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Dona lê o logótipo da sua loja"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Dona substitui o logótipo da sua loja"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Dona remove o logótipo da sua loja"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
