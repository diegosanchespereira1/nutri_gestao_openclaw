-- Causa-raiz: default privileges concedem EXECUTE em funções novas a anon/authenticated.
-- Isto impede que o lint 0028 volte a aparecer em cada migration futura.
-- Não altera grants de funções já existentes — apenas funções criadas daqui em diante.

alter default privileges for role postgres in schema public
  revoke all on functions from public;

alter default privileges for role postgres in schema public
  revoke all on functions from anon;

alter default privileges for role postgres in schema public
  revoke all on functions from authenticated;

-- Convenção: conceder EXECUTE explicitamente nas migrations que expõem RPC ao app.
