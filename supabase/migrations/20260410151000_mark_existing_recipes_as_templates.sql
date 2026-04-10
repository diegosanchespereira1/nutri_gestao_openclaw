-- Marca as fichas técnicas existentes como templates
-- Isso permite que sejam usadas como base para criar novas receitas

UPDATE public.technical_recipes
SET is_template = true
WHERE is_template = false
  AND created_at IS NOT NULL;
