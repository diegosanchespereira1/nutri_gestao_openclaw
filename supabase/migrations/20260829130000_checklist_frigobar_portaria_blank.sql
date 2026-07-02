-- Migration: remove referência de portaria do checklist de Frigobar.
-- O checklist não é vinculado a nenhuma portaria específica — campo fica em branco.

update public.checklist_templates
set portaria_ref = ''
where id = 'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00';
