-- Adicionar flag de template em technical_recipes — permite que usuários criem templates para reutilizar
-- Guard: a tabela só é criada em 20260420120000; em db reset fresh este ficheiro corre antes.

do $$
begin
  if to_regclass('public.technical_recipes') is null then
    raise notice 'technical_recipes ainda não existe — adiado para 20260420120000';
    return;
  end if;

  alter table public.technical_recipes
    add column if not exists is_template boolean not null default false;

  create index if not exists technical_recipes_is_template_idx
    on public.technical_recipes (is_template, establishment_id, created_at desc);
end $$;
