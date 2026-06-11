-- Índices de seguimento a partir de pg_stat_statements / Index Advisor (Supabase).
-- Ignorados de propósito (não migráveis aqui ou já cobertos):
--   - PostgREST set_config, GoTrue (auth.*), pgbouncer.get_auth, pg_available_extensions
--   - get_checklist_validity_alerts / RPC: plano dominado pela função (ver migração 20260810140000)
--   - checklist_fill_sessions(workspace_template_id): checklist_fill_sessions_workspace_idx
--   - checklist_workspace_items(workspace_section_id): checklist_workspace_items_section_pos_idx
--   - establishments ORDER BY created_at + client_id: establishments_client_created_idx
--   - clients só por created_at: clients_owner_created_idx
--   - checklist_establishment_recent ORDER BY last_opened_at: checklist_establishment_recent_user_last_opened_idx
--   - storage.objects(bucket_id, name): ver nota no fim do ficheiro (owner ≠ role de migração)

-- Lista de clientes PJ/PF: owner_user_id + kind + ordenação por data (PostgREST).
CREATE INDEX IF NOT EXISTS clients_owner_kind_created_idx
  ON public.clients (owner_user_id, kind, created_at DESC);

-- Utentes por cliente ou estabelecimento com ORDER BY full_name.
CREATE INDEX IF NOT EXISTS patients_client_full_name_idx
  ON public.patients (client_id, full_name)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS patients_establishment_full_name_idx
  ON public.patients (establishment_id, full_name)
  WHERE establishment_id IS NOT NULL;

-- Fichas técnicas: listagens por updated_at (embeds + order no PostgREST).
CREATE INDEX IF NOT EXISTS technical_recipes_updated_at_idx
  ON public.technical_recipes (updated_at DESC);

-- Storage (bucket_id, name): o Index Advisor pode sugerir índice em storage.objects.
-- Não criar aqui: a tabela `storage.objects` não é owned pelo role das migrações
-- (SQLSTATE 42501 em `supabase db reset` / `db push` local e em muitos ambientes).
-- Se for necessário no projeto hosted, executar manualmente no SQL Editor do Dashboard
-- (superuser / owner do schema storage), por exemplo:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS storage_objects_bucket_id_name_idx
--     ON storage.objects (bucket_id, name);
