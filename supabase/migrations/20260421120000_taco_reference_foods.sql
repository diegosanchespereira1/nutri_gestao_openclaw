-- Catálogo de referência tipo TACO (Story 6.2) — leitura global; sem RLS de tenant nas linhas de referência.

create table if not exists public.taco_reference_foods (
  id uuid primary key default gen_random_uuid(),
  taco_code text not null,
  name text not null,
  kcal_per_100g numeric(12, 4) not null,
  protein_g_per_100g numeric(12, 4) not null default 0,
  carb_g_per_100g numeric(12, 4) not null default 0,
  lipid_g_per_100g numeric(12, 4) not null default 0,
  fiber_g_per_100g numeric(12, 4) not null default 0,
  constraint taco_reference_foods_code_len check (char_length(trim(taco_code)) > 0),
  constraint taco_reference_foods_name_len check (char_length(trim(name)) > 0),
  constraint taco_reference_foods_code_unique unique (taco_code)
);

create index if not exists taco_reference_foods_name_ilike_idx
  on public.taco_reference_foods (lower(name));

alter table public.taco_reference_foods enable row level security;

create policy "taco_reference_foods_select_authenticated"
  on public.taco_reference_foods for select
  to authenticated
  using (true);

grant select on public.taco_reference_foods to authenticated;

-- Amostra MVP (valores ilustrativos por 100 g; substituível por importação oficial no épico 10).
insert into public.taco_reference_foods (
  taco_code,
  name,
  kcal_per_100g,
  protein_g_per_100g,
  carb_g_per_100g,
  lipid_g_per_100g,
  fiber_g_per_100g
)
values
  ('TACO-MVP-001', 'Arroz branco cozido', 128, 2.5, 28.0, 0.2, 0.3),
  ('TACO-MVP-002', 'Arroz integral cozido', 124, 2.6, 25.8, 1.0, 1.8),
  ('TACO-MVP-003', 'Feijão carioca cozido', 76, 4.5, 13.6, 0.5, 4.8),
  ('TACO-MVP-004', 'Feijão preto cozido', 77, 4.5, 14.0, 0.5, 4.5),
  ('TACO-MVP-005', 'Macarrão cozido (sem óleo)', 158, 5.8, 30.9, 0.9, 1.8),
  ('TACO-MVP-006', 'Batata cozida', 52, 1.2, 11.9, 0.1, 1.8),
  ('TACO-MVP-007', 'Batata doce cozida', 86, 1.6, 20.1, 0.1, 2.7),
  ('TACO-MVP-008', 'Mandioca cozida', 125, 0.6, 30.1, 0.3, 1.9),
  ('TACO-MVP-009', 'Cenoura cozida', 35, 0.8, 8.2, 0.2, 2.3),
  ('TACO-MVP-010', 'Brócolos cozidos', 35, 2.8, 7.2, 0.4, 3.3),
  ('TACO-MVP-011', 'Couve manteiga refogada', 51, 2.7, 6.1, 0.7, 2.8),
  ('TACO-MVP-012', 'Tomate cru', 15, 1.1, 3.1, 0.2, 1.2),
  ('TACO-MVP-013', 'Alface americana', 14, 1.4, 2.9, 0.2, 1.7),
  ('TACO-MVP-014', 'Banana prata', 98, 1.3, 26.0, 0.1, 2.0),
  ('TACO-MVP-015', 'Maçã com casca', 63, 0.3, 16.6, 0.2, 2.0),
  ('TACO-MVP-016', 'Laranja', 45, 0.9, 11.5, 0.1, 2.2),
  ('TACO-MVP-017', 'Leite integral', 61, 3.1, 4.6, 3.3, 0),
  ('TACO-MVP-018', 'Iogurte natural integral', 61, 3.5, 4.7, 3.0, 0),
  ('TACO-MVP-019', 'Queijo minas frescal', 264, 17.4, 3.2, 20.2, 0),
  ('TACO-MVP-020', 'Ovo de galinha cozido', 146, 13.3, 0.6, 9.5, 0),
  ('TACO-MVP-021', 'Frango grelhado (peito sem pele)', 159, 32.0, 0, 3.2, 0),
  ('TACO-MVP-022', 'Carne bovina moída cozida (magra)', 212, 26.0, 0, 11.0, 0),
  ('TACO-MVP-023', 'Atum em conserva (escorrido)', 116, 25.5, 0, 0.8, 0),
  ('TACO-MVP-024', 'Sardinha em conserva (escorrida)', 186, 22.0, 0, 10.0, 0),
  ('TACO-MVP-025', 'Pão francês', 300, 8.0, 58.6, 3.1, 2.3),
  ('TACO-MVP-026', 'Aveia em flocos', 394, 13.9, 66.6, 6.9, 9.1),
  ('TACO-MVP-027', 'Açúcar refinado', 387, 0, 99.6, 0, 0),
  ('TACO-MVP-028', 'Óleo de soja', 884, 0, 0, 100.0, 0),
  ('TACO-MVP-029', 'Manteiga', 717, 0.9, 0.1, 81.1, 0),
  ('TACO-MVP-030', 'Sal refinado', 0, 0, 0, 0, 0),
  ('TACO-MVP-031', 'Mel', 309, 0.4, 84.0, 0, 0.2),
  ('TACO-MVP-032', 'Amendoim torrado salgado', 606, 22.5, 18.7, 54.0, 8.0),
  ('TACO-MVP-033', 'Castanha de caju', 553, 18.5, 30.2, 43.9, 3.3),
  ('TACO-MVP-034', 'Café infuso (sem açúcar)', 2, 0.1, 0, 0, 0),
  ('TACO-MVP-035', 'Polvilho doce', 331, 0.2, 81.1, 0.1, 0.2)
on conflict (taco_code) do nothing;

alter table public.technical_recipe_lines
  add column if not exists taco_food_id uuid references public.taco_reference_foods (id) on delete set null;

create index if not exists technical_recipe_lines_taco_food_idx
  on public.technical_recipe_lines (taco_food_id)
  where taco_food_id is not null;
