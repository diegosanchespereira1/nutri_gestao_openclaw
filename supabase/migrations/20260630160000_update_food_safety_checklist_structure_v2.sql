-- Atualiza o checklist "Segurança e Boas Práticas em Manipulação de Alimentos" (spec v2)
-- Fonte: alinhamento validado em chat (04/05/2026)
-- Estratégia:
--   - manter template original e IDs existentes quando possível
--   - inserir nova seção "Asseio pessoal" antes de "Documentação"
--   - reordenar/renomear itens sem alterar a seção de documentação

-- Template alvo
-- a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00

-- 1) Seções: ordem final e nova seção 5 (Asseio pessoal)
insert into public.checklist_template_sections (id, template_id, title, position)
values (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
  'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
  'Asseio pessoal',
  4
)
on conflict (id) do update
set title = excluded.title,
    position = excluded.position;

update public.checklist_template_sections
set title = 'Estrutura e edificação',
    position = 0
where id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';

update public.checklist_template_sections
set title = 'Equipamentos, móveis e utensílios',
    position = 1
where id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02';

update public.checklist_template_sections
set title = 'Recebimento e armazenamento',
    position = 2
where id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03';

update public.checklist_template_sections
set title = 'Manipulação e Boas Práticas',
    position = 3
where id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04';

update public.checklist_template_sections
set title = 'Documentação',
    position = 5
where id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05';

-- 2) Seção 1: Estrutura e edificação (8 itens)
update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Piso, parede, teto e porta limpos e em boas condições de conservação',
    position = 0
where id = 'c1ee0001-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Iluminação adequada e protegida',
    position = 1
where id = 'c1ee0002-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Ventilação adequada',
    position = 2
where id = 'c1ee0003-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Janelas com tela milimétrica, limpas e em boas condições de conservação',
    position = 3
where id = 'c1ee0004-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Ralos telados/sifonados',
    position = 4
where id = 'c1ee0005-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Fluxo operacional adequado',
    position = 5
where id = 'c1ee0006-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Pia exclusiva de higienização de mãos em bom estado e abastecida',
    position = 6
where id = 'c1ee0007-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    description = 'Planilha de higiene ambiental preenchida',
    position = 7
where id = 'c1ee0008-9c0b-4ef8-bb6d-6bb9bd380b00';

-- 3) Seção 2: Equipamentos, móveis e utensílios (6 itens)
update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
    description = 'Equipamentos em bom estado de conservação e limpos',
    position = 0
where id = 'c1ee0009-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
    description = 'Utensílios limpos, organizados e em bom estado de conservação',
    position = 1
where id = 'c1ee0010-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
    description = 'Bancadas e superfícies limpas e em boas condições de conservação',
    position = 2
where id = 'c1ee0011-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
    description = 'Termômetros funcionando',
    position = 3
where id = 'c1ee0012-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
    description = 'Lixeira limpa, com tampa e acionamento por pedal',
    position = 4
where id = 'c1ee0014-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
    description = 'Planilha de controle de temperatura preenchida',
    position = 5
where id = 'c1ee0013-9c0b-4ef8-bb6d-6bb9bd380b00';

-- 4) Seção 3: Recebimento e armazenamento (7 itens)
update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
    description = 'Recebimento adequado',
    position = 0
where id = 'c1ee0015-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
    description = 'Produto dentro da validade',
    position = 1
where id = 'c1ee0016-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
    description = 'planilha de recebimento devidamente preenchida',
    position = 2
where id = 'c1ee0017-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
    description = 'armazenamento seco adequado',
    position = 3
where id = 'c1ee0018-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
    description = 'armazenamento refrigerado adequado',
    position = 4
where id = 'c1ee0019-9c0b-4ef8-bb6d-6bb9bd380b00';

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0044-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'Produtos armazenado conforme PVPS',
   true,
   5),
  ('c1ee0045-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'Produtos devidamente identificado a e na validade',
   true,
   6)
on conflict (id) do update
set section_id = excluded.section_id,
    description = excluded.description,
    position = excluded.position;

-- 5) Seção 4: Manipulação e Boas Práticas (10 itens)
update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
    description = 'Higiene das mãos adequada',
    position = 0
where id = 'c1ee0020-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
    description = 'Identificação correta dos produtos',
    position = 1
where id = 'c1ee0024-9c0b-4ef8-bb6d-6bb9bd380b00';

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0046-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Alimentos dentro do prazo de validade',
   true,
   2)
on conflict (id) do update
set section_id = excluded.section_id,
    description = excluded.description,
    position = excluded.position;

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
    description = 'Produtos protegidos',
    position = 3
where id = 'c1ee0025-9c0b-4ef8-bb6d-6bb9bd380b00';

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0047-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Possui amostra dos alimentos',
   false,
   4)
on conflict (id) do update
set section_id = excluded.section_id,
    description = excluded.description,
    position = excluded.position;

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
    description = 'Controle de tempo e temperatura dos alimentos',
    position = 5
where id = 'c1ee0023-9c0b-4ef8-bb6d-6bb9bd380b00';

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0048-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Higienização correta dos hortifrutis',
   false,
   6)
on conflict (id) do update
set section_id = excluded.section_id,
    description = excluded.description,
    position = excluded.position;

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
    description = 'Descarte adequado de resíduos',
    position = 7
where id = 'c1ee0028-9c0b-4ef8-bb6d-6bb9bd380b00';

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0049-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Planilha de temperatura dos alimentos preenchida',
   true,
   8),
  ('c1ee0050-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Planilha de controle de troca de óleo',
   true,
   9)
on conflict (id) do update
set section_id = excluded.section_id,
    description = excluded.description,
    position = excluded.position;

-- 6) Seção 5: Asseio pessoal (6 itens)
update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
    description = 'Uniforme completo e em bom estado de conservação',
    position = 0
where id = 'c1ee0026-9c0b-4ef8-bb6d-6bb9bd380b00';

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
    description = 'Faz uso de adornos',
    position = 1
where id = 'c1ee0021-9c0b-4ef8-bb6d-6bb9bd380b00';

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0051-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
   'Faz uso de barba ou esmalte',
   false,
   2)
on conflict (id) do update
set section_id = excluded.section_id,
    description = excluded.description,
    position = excluded.position;

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
    description = 'Faz uso de EPI',
    position = 3
where id = 'c1ee0022-9c0b-4ef8-bb6d-6bb9bd380b00';

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0052-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
   'Higiene das mãos adequada',
   true,
   4)
on conflict (id) do update
set section_id = excluded.section_id,
    description = excluded.description,
    position = excluded.position;

update public.checklist_template_items
set section_id = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b06',
    description = 'Comportamento adequado durante a manipulação dos alimentos',
    position = 5
where id = 'c1ee0027-9c0b-4ef8-bb6d-6bb9bd380b00';
