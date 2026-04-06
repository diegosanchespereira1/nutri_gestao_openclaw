-- Épico 7 — POPs: templates por tipo de estabelecimento, documentos por estabelecimento, versões imutáveis.

-- Catálogo global (leitura para profissionais autenticados)
create table if not exists public.pop_templates (
  id uuid primary key default gen_random_uuid(),
  establishment_type text not null,
  name text not null,
  description text,
  body text not null,
  position integer not null default 0,
  constraint pop_templates_type_check check (
    establishment_type in (
      'escola',
      'hospital',
      'clinica',
      'lar_idosos',
      'empresa'
    )
  ),
  constraint pop_templates_name_len check (char_length(trim(name)) > 0),
  constraint pop_templates_body_len check (char_length(trim(body)) > 0)
);

create index if not exists pop_templates_type_pos_idx
  on public.pop_templates (establishment_type, position, name);

alter table public.pop_templates enable row level security;

create policy "pop_templates_select_authenticated"
  on public.pop_templates for select
  to authenticated
  using (true);

grant select on public.pop_templates to authenticated;

create table if not exists public.establishment_pops (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  title text not null,
  source_template_id uuid references public.pop_templates (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishment_pops_title_len check (char_length(trim(title)) > 0)
);

create index if not exists establishment_pops_establishment_idx
  on public.establishment_pops (establishment_id, updated_at desc);

alter table public.establishment_pops enable row level security;

create policy "establishment_pops_select_own"
  on public.establishment_pops for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "establishment_pops_insert_own"
  on public.establishment_pops for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "establishment_pops_update_own"
  on public.establishment_pops for update
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

create policy "establishment_pops_delete_own"
  on public.establishment_pops for delete
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.establishment_pops to authenticated;

create table if not exists public.pop_versions (
  id uuid primary key default gen_random_uuid(),
  pop_id uuid not null references public.establishment_pops (id) on delete cascade,
  version_number integer not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint pop_versions_number_pos check (version_number >= 1),
  constraint pop_versions_title_len check (char_length(trim(title)) > 0),
  constraint pop_versions_body_len check (char_length(trim(body)) > 0),
  constraint pop_versions_pop_version_unique unique (pop_id, version_number)
);

create index if not exists pop_versions_pop_version_idx
  on public.pop_versions (pop_id, version_number desc);

alter table public.pop_versions enable row level security;

create policy "pop_versions_select_own"
  on public.pop_versions for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishment_pops p
      join public.establishments e on e.id = p.establishment_id
      join public.clients c on c.id = e.client_id
      where
        p.id = pop_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "pop_versions_insert_own"
  on public.pop_versions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.establishment_pops p
      join public.establishments e on e.id = p.establishment_id
      join public.clients c on c.id = e.client_id
      where
        p.id = pop_id
        and c.owner_user_id = (select auth.uid())
        and c.kind = 'pj'
    )
  );

grant select, insert on public.pop_versions to authenticated;

create or replace function public.establishment_pops_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists establishment_pops_set_updated_at on public.establishment_pops;

create trigger establishment_pops_set_updated_at
before update on public.establishment_pops
for each row
execute function public.establishment_pops_touch_updated_at ();

-- Seeds MVP (um modelo por tipo)
insert into public.pop_templates (
  establishment_type,
  name,
  description,
  body,
  position
)
values
  (
    'escola',
    'Recebimento e armazenamento de gêneros alimentícios',
    'Fluxo básico para escolas — ajuste ao seu PNAE / cozinha.',
    $t$
1. Objetivo
Garantir que alimentos recebidos estejam conformes e armazenados com segurança.

2. Recebimento
- Conferir nota fiscal, validade, aspecto e temperatura (quando aplicável).
- Registrar não conformidades e acionar fornecedor se necessário.

3. Armazenamento
- Separar cru / cozido / limpeza; etiquetar com data de recebimento.
- Respeitar cadeia de frio.

4. Registos
- Manter registos de temperatura e descarte quando aplicável.
$t$,
    1
  ),
  (
    'hospital',
    'Manipulação e distribuição de dieta hospitalar',
    'Base para UAN / nutrição clínica — personalize por setor.',
    $t$
1. Objetivo
Padronizar manipulação e distribuição de dietas com segurança.

2. Antes da manipulação
- Higienizar mãos; usar uniforme e touca.
- Verificar prescrição e tipo de dieta.

3. Manipulação
- Evitar contaminação cruzada; usar utensílios adequados por dieta.
- Etiquetar bandejas com leito / tipo de dieta.

4. Distribuição
- Respeitar horários; registrar sobras e devoluções conforme protocolo local.
$t$,
    1
  ),
  (
    'clinica',
    'Higienização de superfícies e materiais — clínica',
    'Checklist enxuto para áreas assistenciais.',
    $t$
1. Objetivo
Reduzir risco de infecção em superfícies de contacto frequente.

2. Frequência
- Definir por área (sala, receção, WC) conforme risco.

3. Procedimento
- Usar solução e tempo de contacto aprovados.
- De cima para baixo, limpo para sujo.

4. Registo
- Assinar checklist ou registo digital quando exigido.
$t$,
    1
  ),
  (
    'lar_idosos',
    'Serviço de refeições e auxílio na alimentação',
    'Lar / ILPI — adaptar às necessidades dos residentes.',
    $t$
1. Objetivo
Garantir refeições seguras e respeito às restrições individuais.

2. Preparação
- Conferir cardápio e restrições (textura, alergénios, medicamentos).

3. Serviço
- Identificar residente; confirmar tipo de dieta servida.

4. Observações
- Registar recusas, quedas de apetite ou queixas para equipa de saúde.
$t$,
    1
  ),
  (
    'empresa',
    'Cantina / refeitório corporativo — boas práticas',
    'Base para empresa / refeitório colectivo.',
    $t$
1. Objetivo
Assegurar segurança alimentar no self-service ou serviço assistido.

2. Exposição e conservação
- Manter cadeia de frio/quente; rotacionar lotes (FIFO).

3. Utensílios e postos
- Talheres e bandejas higienizados; postos de mão limpa identificados.

4. Queixas
- Canal para reportar incidentes; registo para melhoria contínua.
$t$,
    1
  );
