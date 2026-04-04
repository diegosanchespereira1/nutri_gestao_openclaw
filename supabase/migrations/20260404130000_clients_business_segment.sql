-- Segmento do negócio (PJ) para lista e relatórios — PF mantém null.

alter table public.clients
  add column if not exists business_segment text;

alter table public.clients
  drop constraint if exists clients_business_segment_check;

alter table public.clients
  add constraint clients_business_segment_check check (
    business_segment is null
    or business_segment in (
      'padaria',
      'mercado',
      'escola',
      'hospital',
      'clinica',
      'restaurante',
      'hotel',
      'industria_alimenticia',
      'lar_idosos',
      'empresa',
      'outro'
    )
  );

create index if not exists clients_owner_segment_idx
  on public.clients (owner_user_id, business_segment)
  where business_segment is not null;
