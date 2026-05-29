-- Corrige audit_log_trigger() para usar auth.uid() em vez de new.user_id / old.user_id.
-- Tabelas como patient_nutrition_assessments não têm user_id, o que causava um erro
-- em runtime do PL/pgSQL e revertia toda a transação de INSERT.
-- auth.uid() é semanticamente mais correto: regista quem executou a ação,
-- não quem é dono do registo.

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger AS $$
DECLARE
  old_masked jsonb;
  new_masked jsonb;
BEGIN
  old_masked := CASE
    WHEN tg_op = 'DELETE' THEN mask_sensitive_fields(row_to_json(old)::jsonb)
    WHEN tg_op = 'UPDATE' THEN mask_sensitive_fields(row_to_json(old)::jsonb)
    ELSE null
  END;

  new_masked := CASE
    WHEN tg_op = 'INSERT' THEN mask_sensitive_fields(row_to_json(new)::jsonb)
    WHEN tg_op = 'UPDATE' THEN mask_sensitive_fields(row_to_json(new)::jsonb)
    ELSE null
  END;

  INSERT INTO public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at
  ) VALUES (
    auth.uid(),
    tg_table_name,
    tg_op,
    CASE
      WHEN tg_op = 'DELETE' THEN (old.id)::uuid
      ELSE (new.id)::uuid
    END,
    old_masked,
    new_masked,
    now() + INTERVAL '12 months'
  );

  RETURN CASE
    WHEN tg_op = 'DELETE' THEN old
    ELSE new
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
