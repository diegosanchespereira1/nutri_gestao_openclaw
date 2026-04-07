-- Story 8.4 — Contratos a partir de modelos
-- Templates geridos pelo admin; profissionais geram PDF pré-preenchido com dados do cliente.

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),

  -- null = template global (admin); uuid = template privado do profissional
  owner_user_id uuid references auth.users (id) on delete cascade,

  title text not null,
  description text,
  -- Corpo do template com variáveis: {{client_name}}, {{contract_start}}, {{contract_end}},
  -- {{billing_recurrence}}, {{monthly_amount}}, {{professional_name}}, {{professional_crn}}, {{date}}
  body_html text not null default '',
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_templates_owner_idx
  on public.contract_templates (owner_user_id);

create index if not exists contract_templates_global_idx
  on public.contract_templates (is_active)
  where owner_user_id is null;

alter table public.contract_templates enable row level security;

-- Profissionais autenticados veem templates globais (admin) e os seus próprios
create policy "contract_templates_select_authenticated"
  on public.contract_templates for select
  to authenticated
  using (
    owner_user_id is null
    or owner_user_id = (select auth.uid())
  );

-- Profissionais só inserem os seus próprios
create policy "contract_templates_insert_own"
  on public.contract_templates for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "contract_templates_update_own"
  on public.contract_templates for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "contract_templates_delete_own"
  on public.contract_templates for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

create or replace function public.contract_templates_touch_updated_at ()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contract_templates_set_updated_at on public.contract_templates;

create trigger contract_templates_set_updated_at
before update on public.contract_templates
for each row
execute function public.contract_templates_touch_updated_at ();

grant select, insert, update, delete on public.contract_templates to authenticated;

-- ── Seed: 2 templates globais de exemplo ─────────────────────────────────────
insert into public.contract_templates (id, owner_user_id, title, description, body_html)
values
(
  gen_random_uuid(),
  null,
  'Contrato de Prestação de Serviços — Padrão',
  'Modelo básico de contrato nutricional para clientes PF ou PJ.',
  '<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS NUTRICIONAIS</h1>
<p><strong>CONTRATANTE:</strong> {{client_name}}</p>
<p><strong>CONTRATADA:</strong> {{professional_name}} — CRN {{professional_crn}}</p>
<h2>1. Objeto</h2>
<p>Prestação de serviços de consultoria nutricional conforme acordado entre as partes.</p>
<h2>2. Vigência</h2>
<p>De <strong>{{contract_start}}</strong> a <strong>{{contract_end}}</strong>.</p>
<h2>3. Valor e Forma de Pagamento</h2>
<p>{{billing_recurrence}} — {{monthly_amount}}</p>
<h2>4. Rescisão</h2>
<p>Qualquer parte pode rescindir com aviso prévio de 30 dias.</p>
<p style="margin-top:48px;">Data: {{date}}</p>
<p>_______________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;_______________________________</p>
<p>{{professional_name}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{client_name}}</p>'
),
(
  gen_random_uuid(),
  null,
  'Contrato de Acompanhamento Nutricional — Recorrente',
  'Modelo para serviços com recorrência mensal ou anual.',
  '<h1>CONTRATO DE ACOMPANHAMENTO NUTRICIONAL</h1>
<p><strong>Profissional:</strong> {{professional_name}} (CRN {{professional_crn}})</p>
<p><strong>Cliente:</strong> {{client_name}}</p>
<p><strong>Início:</strong> {{contract_start}} &nbsp;|&nbsp; <strong>Fim:</strong> {{contract_end}}</p>
<p><strong>Modalidade:</strong> {{billing_recurrence}} — {{monthly_amount}}</p>
<h2>Condições Gerais</h2>
<p>O presente contrato regula a prestação de serviços nutricionais de acordo com as normas do CFN e CRN competente.</p>
<p style="margin-top:48px;">{{date}}</p>
<p>Assinatura do Profissional: _______________________________</p>
<p>Assinatura do Cliente: _______________________________</p>'
)
on conflict do nothing;
