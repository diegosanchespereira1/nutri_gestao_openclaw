-- Execução manual (SQL Editor): alinhamento tenant vs membros da equipa.
-- clients.owner_user_id e patients.user_id devem ser o UUID do titular (auth.users),
-- não o de um membro convidado.

-- Clientes cujo owner_user_id é member_user_id de alguém (deveria ser raro após a migração de correção).
select c.id, c.legal_name, c.owner_user_id, tm.owner_user_id as titular_esperado
from public.clients c
join public.team_members tm on tm.member_user_id = c.owner_user_id;

-- Pacientes com user_id que não coincide com o titular do cliente (quando há client_id).
select p.id, p.full_name, p.user_id as patient_tenant, cl.owner_user_id as client_tenant, cl.id as client_id
from public.patients p
join public.clients cl on cl.id = p.client_id
where p.user_id is distinct from cl.owner_user_id;
