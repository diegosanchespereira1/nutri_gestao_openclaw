-- Migração: um estabelecimento por cliente (1:1).
--
-- Regra de negócio: cada CNPJ é único → cada cliente PJ deve ter no máximo
-- 1 estabelecimento. Se uma empresa possuir 3 unidades físicas, o profissional
-- cadastra 3 clientes distintos, um para cada CNPJ/estabelecimento.
--
-- Esta migration adiciona um UNIQUE constraint em establishments.client_id,
-- garantindo a integridade no banco independentemente da validação de aplicação.
--
-- ATENÇÃO: antes de aplicar em produção, verificar se existem clientes com
-- mais de um estabelecimento e tomar a ação necessária (separar cadastros).
-- Query de diagnóstico:
--   SELECT client_id, COUNT(*) AS total
--   FROM public.establishments
--   GROUP BY client_id
--   HAVING COUNT(*) > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'establishments_one_per_client'
      and conrelid = 'public.establishments'::regclass
  ) then
    alter table public.establishments
      add constraint establishments_one_per_client unique (client_id);
  end if;
end;
$$;

comment on constraint establishments_one_per_client on public.establishments
  is 'Cada cliente PJ pode ter no máximo 1 estabelecimento (regra de negócio: 1 CNPJ = 1 estabelecimento = 1 cliente).';
