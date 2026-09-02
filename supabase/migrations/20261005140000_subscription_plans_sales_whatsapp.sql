-- WhatsApp comercial do plano (usado no Enterprise no cadastro público).

alter table public.subscription_plans
  add column if not exists sales_whatsapp text;

comment on column public.subscription_plans.sales_whatsapp is
  'Telefone WhatsApp (só dígitos, com DDI) para CTA comercial. Ex.: 5511999999999.';
