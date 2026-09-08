-- Marca as fichas técnicas existentes como templates
-- Isso permite que sejam usadas como base para criar novas receitas
-- Guard: tabela criada só em 20260420120000.

do $$
begin
  if to_regclass('public.technical_recipes') is null then
    raise notice 'technical_recipes ainda não existe — skip mark templates';
    return;
  end if;

  update public.technical_recipes
  set is_template = true
  where is_template = false
    and created_at is not null;
end $$;
