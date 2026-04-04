-- Catálogo global de templates de portaria — Story 3.1 (FR12).
-- Leitura para authenticated; escrita apenas via service_role / migrações.

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  portaria_ref text not null,
  uf text not null,
  applies_to text[] not null,
  description text,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_templates_uf_len check (char_length(uf) = 2 or uf = '*')
);

create index if not exists checklist_templates_uf_active_idx
  on public.checklist_templates (uf, is_active)
  where is_active = true;

create table if not exists public.checklist_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checklist_template_sections_template_position_idx
  on public.checklist_template_sections (template_id, position);

create table if not exists public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.checklist_template_sections (id) on delete cascade,
  description text not null,
  is_required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checklist_template_items_section_position_idx
  on public.checklist_template_items (section_id, position);

alter table public.checklist_templates enable row level security;
alter table public.checklist_template_sections enable row level security;
alter table public.checklist_template_items enable row level security;

create policy "checklist_templates_select_authenticated"
  on public.checklist_templates for select
  to authenticated
  using (true);

create policy "checklist_template_sections_select_authenticated"
  on public.checklist_template_sections for select
  to authenticated
  using (true);

create policy "checklist_template_items_select_authenticated"
  on public.checklist_template_items for select
  to authenticated
  using (true);

grant select on public.checklist_templates to authenticated;
grant select on public.checklist_template_sections to authenticated;
grant select on public.checklist_template_items to authenticated;

-- Seed MVP: Portaria CVS-5/2013 (SP) — boas práticas (exemplo didático, não jurídico).
insert into public.checklist_templates (
  id,
  name,
  portaria_ref,
  uf,
  applies_to,
  description,
  version,
  is_active
)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Portaria CVS-5/2013 — Boas práticas de manipulação (referência SP)',
  'CVS-5/2013',
  'SP',
  array['escola', 'hospital', 'clinica', 'lar_idosos', 'empresa']::text[],
  'Checklist de referência para inspeção sanitária em serviços de alimentação (MVP — dados de exemplo).',
  1,
  true
)
on conflict (id) do nothing;

insert into public.checklist_template_sections (id, template_id, title, position)
values
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Instalações e higiene geral', 0),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Manipulação e armazenamento de alimentos', 1),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Documentação e controlo', 2)
on conflict (id) do nothing;

insert into public.checklist_template_items (id, section_id, description, is_required, position)
values
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Áreas de preparação limpas, sem acumulação de lixo e com piso lavável.', true, 0),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Ventilação adequada nas cozinhas e despensas.', false, 1),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'Iluminação suficiente em todas as zonas de trabalho.', true, 2),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Separação entre alimentos crus e cozinhados (utensílios e superfícies).', true, 0),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Cadeia de frio respeitada: temperaturas de refrigeração registadas quando aplicável.', true, 1),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Produtos armazenados com identificação e validade visível.', true, 2),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Água potável disponível para consumo e preparo.', false, 3),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Registo de temperaturas ou equivalente conforme portaria aplicável.', true, 0),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a09', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Treinamento básico em boas práticas documentado para manipuladores.', false, 1),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a10', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Plano de limpeza definido e com evidências de execução.', true, 2)
on conflict (id) do nothing;
