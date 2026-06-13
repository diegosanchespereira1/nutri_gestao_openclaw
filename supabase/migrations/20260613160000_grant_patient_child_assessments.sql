-- Fix: concede permissões de tabela ao papel `authenticated` para
-- patient_child_assessments. Sem este GRANT, o INSERT falha com
-- "42501: permission denied for table" mesmo com as RLS policies corretas
-- (a RLS controla as linhas; o GRANT controla o acesso à tabela).
-- Idempotente: pode ser reaplicado sem efeito colateral.

grant select, insert, update, delete on patient_child_assessments to authenticated;
