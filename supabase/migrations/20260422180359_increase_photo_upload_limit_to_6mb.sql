-- Aumentar limite de tamanho de arquivo para photos do checklist (Story XXX)
-- Mudando de 1MB para 6MB para suportar fotos de câmara do telemóvel

-- Atualizar a configuração do bucket via RLS (nota: a maioria das configurações de bucket
-- são geridas no Supabase console, mas podemos documentar a alteração aqui)
-- Para ambientes Supabase hosted, aceder a: Storage > buckets > checklist-fill-photos > Edit > Max file size

-- Documentação: O limite deve ser definido como 6 MiB (6291456 bytes)
-- Razão: Fotos de câmara de telemóvel tipicamente variam 2-5 MB dependendo da resolução e compressão

-- Validação no código TypeScript (checklist-fill-photos.ts):
-- - CHECKLIST_FILL_PHOTO_MAX_BYTES = 6 * 1024 * 1024 (verificado ✓)

-- Validação da Server Action (checklist-fill-photos.ts):
-- - Erro do servidor: "A imagem é demasiado grande (máx. 6 MB)." (verificado ✓)

-- Help text (checklist-item-photos.tsx):
-- - "Formatos JPEG, PNG ou WebP até 6 MB." (verificado ✓)

-- Para Supabase local (supabase/config.toml):
-- - file_size_limit = "50MiB" (já suficiente)
