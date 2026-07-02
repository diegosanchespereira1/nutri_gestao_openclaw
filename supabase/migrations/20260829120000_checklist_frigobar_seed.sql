-- Migration: insere checklist "Relatório de Auditoria de Procedimentos de Segurança
-- dos Alimentos no Serviço de Frigobar" (base: RA Frigobar — Atlântica).
-- 11 seções · 40 itens · sem subseções · peso default (1) · uf = '*' (todas as UFs).
-- IDs fixos para suportar re-run idempotente via ON CONFLICT.

-- ── 1. Template ───────────────────────────────────────────────────────────────

insert into public.checklist_templates (
  id, name, portaria_ref, uf, applies_to, description, version, is_active
)
values (
  'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
  'Relatório de Auditoria de Procedimentos de Segurança dos Alimentos no Serviço de Frigobar',
  '',
  '*',
  array['hotel']::text[],
  'Checklist de auditoria de segurança dos alimentos para o serviço de frigobar em hotelaria. '
  'Cobre instalações, móveis e equipamentos, manejo de resíduos, processos de higienização, '
  'recebimento, armazenamento, higiene pessoal, registros, documentos e minibar.',
  1,
  true
)
on conflict (id) do nothing;

-- ── 2. Seções ─────────────────────────────────────────────────────────────────

insert into public.checklist_template_sections (id, template_id, title, position)
values
  ('b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '1. Instalações, Móveis, Equipamentos e Utensílios', 0),

  ('b3ee0002-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '2. Móveis, Equipamentos e Utensílios', 1),

  ('b3ee0003-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '3. Manejo de Resíduos', 2),

  ('b3ee0004-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '4. Processos de Higienização - Produtos/Materiais de Limpeza', 3),

  ('b3ee0005-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '5. Processos de Higienização - Higiene Ambiental/de Equipamentos e Utensílios', 4),

  ('b3ee0006-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '6. Recebimento', 5),

  ('b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '7. Armazenamento - Armazenamento Geral', 6),

  ('b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '8. Higiene Pessoal', 7),

  ('b3ee0009-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '9. Registros', 8),

  ('b3ee0010-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '10. Documentos', 9),

  ('b3ee0011-9c0b-4ef8-bb6d-6bb9bd380f00',
   'a3eebc99-9c0b-4ef8-bb6d-6bb9bd380f00',
   '11. Minibar', 10)
on conflict (id) do nothing;

-- ── 3. Itens — Seção 1: Instalações, Móveis, Equipamentos e Utensílios ────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0101-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Pisos adequados e bom estado de conservação?',
   true, 0, false, 1),
  ('c3ee0102-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Ralos adequados e em bom estado de conservação?',
   true, 1, false, 1),
  ('c3ee0103-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Paredes adequadas e em bom estado de conservação?',
   true, 2, false, 1),
  ('c3ee0104-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Tetos, forros e luminárias adequados e em bom estado de conservação?',
   true, 3, false, 1),
  ('c3ee0105-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Portas e janelas adequadas e em bom estado de conservação?',
   true, 4, false, 1),
  ('c3ee0106-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Instalações hidráulicas (torneiras, pias, encanamentos) adequadas e em bom estado de conservação?',
   true, 5, false, 1),
  ('c3ee0107-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Instalações elétricas adequadas e em bom estado de conservação?',
   true, 6, false, 1)
on conflict (id) do nothing;

-- ── 4. Itens — Seção 2: Móveis, Equipamentos e Utensílios ─────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0201-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0002-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Armários / prateleiras / bancadas / pallets adequados e em bom estado de conservação?',
   true, 0, false, 1),
  ('c3ee0202-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0002-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Equipamentos de refrigeração adequados e em bom estado de conservação?',
   true, 1, false, 1),
  ('c3ee0203-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0002-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Equipamentos utilizados são adequados e em bom estado de conservação?',
   true, 2, false, 1)
on conflict (id) do nothing;

-- ── 5. Itens — Seção 3: Manejo de Resíduos ────────────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0301-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0003-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Lixos/resíduos internos estão acondicionados em recipientes com tampa sem acionamento manual, em bom estado de conservação, providos de sacos plásticos e limpos?',
   true, 0, false, 1),
  ('c3ee0302-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0003-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Lixos/resíduos internos são removidos na frequência adequada?',
   true, 1, false, 1)
on conflict (id) do nothing;

-- ── 6. Itens — Seção 4: Processos de Higienização - Produtos/Materiais ───────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0401-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0004-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Produtos químicos adequados, regularizados na Agência Nacional de Vigilância Sanitária - ANVISA, utilizados apenas para as finalidades indicadas pelos fabricantes, identificados e dentro do prazo de validade?',
   true, 0, false, 1),
  ('c3ee0402-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0004-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Fichas técnicas e fichas de segurança dos produtos utilizados para higienização disponíveis?',
   true, 1, false, 1),
  ('c3ee0403-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0004-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Utensílios, materiais de limpeza e panos: adequados, em bom estado de conservação e corretamente armazenados?',
   true, 2, false, 1),
  ('c3ee0404-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0004-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Utensílios, materiais de limpeza e panos: estão em bom estado de limpeza?',
   true, 3, false, 1),
  ('c3ee0405-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0004-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Utilização correta de panos de limpeza?',
   true, 4, false, 1)
on conflict (id) do nothing;

-- ── 7. Itens — Seção 5: Processos de Higienização - Higiene Ambiental ─────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0501-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0005-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Instalações limpas?',
   true, 0, false, 1),
  ('c3ee0502-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0005-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Equipamentos de refrigeração/congelados limpos?',
   true, 1, false, 1),
  ('c3ee0503-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0005-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Armazenamento adequado de equipamentos e utensílios higienizados?',
   true, 2, false, 1),
  ('c3ee0504-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0005-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Móveis (armários, prateleiras, pallets, carrinhos de transporte, etc.) e equipamentos SEM contato direto com alimentos estão limpos?',
   true, 3, false, 1),
  ('c3ee0505-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0005-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Armazenamento de alimentos sem contato direto com o piso?',
   true, 4, false, 1),
  ('c3ee0506-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0005-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Ausência de pragas no setor?',
   true, 5, false, 1)
on conflict (id) do nothing;

-- ── 8. Itens — Seção 6: Recebimento ───────────────────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0601-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0006-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Conformidade com os critérios de verificação dos produtos (características organolépticas, integridade de embalagem e rotulagem, data de validade, SIF) e de transporte (caminhão e entregador)?',
   true, 0, false, 1)
on conflict (id) do nothing;

-- ── 9. Itens — Seção 7: Armazenamento - Armazenamento Geral ───────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0701-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Embalagem dos produtos íntegras e com rótulos visíveis (produtos fechados)?',
   true, 0, false, 1),
  ('c3ee0702-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Controle de rotatividade (PEPS/PVPS)?',
   true, 1, false, 1),
  ('c3ee0703-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Produtos na data de validade; ausência de produtos vencidos (validade primária e secundária); produtos adequados para o consumo?',
   true, 2, false, 1),
  ('c3ee0704-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Produtos impróprios para o consumo e/ou que serão descartados estão separados e identificados adequadamente?',
   true, 3, false, 1),
  ('c3ee0705-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Embalagens descartáveis protegidas?',
   true, 4, false, 1),
  ('c3ee0706-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Organização: separação por categorias, distanciamento?',
   true, 5, false, 1),
  ('c3ee0707-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0007-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Alimentos separados dos produtos químicos e das embalagens descartáveis?',
   true, 6, false, 1)
on conflict (id) do nothing;

-- ── 10. Itens — Seção 8: Higiene Pessoal ──────────────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0801-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Hábitos higiênicos adequados (evitando-se coçar, espirrar, tossir, assoar o nariz, degustação de forma adequada)?',
   true, 0, false, 1),
  ('c3ee0802-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Higienização de mãos é realizada conforme método e frequência adequados?',
   true, 1, false, 1),
  ('c3ee0803-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Uniformes adequados, limpos e em bom estado de conservação?',
   true, 2, false, 1),
  ('c3ee0804-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Utilização adequada de EPIs, EPIs em bom estado de conservação, limpeza e em número suficiente?',
   true, 3, false, 1),
  ('c3ee0805-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Proteção adequada para cabelos (nas áreas de preparo) e funcionários com barba feita?',
   true, 4, false, 1),
  ('c3ee0806-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Ausência de qualquer tipo de adorno, maquiagem, esmalte e perfumes?',
   true, 5, false, 1),
  ('c3ee0807-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0008-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Funcionários com unhas curtas, ausência de feridas, cortes e infecções?',
   true, 6, false, 1)
on conflict (id) do nothing;

-- ── 11. Itens — Seção 9: Registros ────────────────────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee0901-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0009-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Registros de controle para rastreabilidade/temperatura no recebimento de alimentos perecíveis e secos?',
   true, 0, false, 1),
  ('c3ee0902-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0009-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Registros de controle dos processos de higienização das instalações, móveis, equipamentos e utensílios?',
   true, 1, false, 1),
  ('c3ee0903-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0009-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Registros de treinamento dos funcionários em BPF?',
   true, 2, false, 1),
  ('c3ee0904-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0009-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Relatório de auditoria interna disponíveis e atualizados?',
   true, 3, false, 1)
on conflict (id) do nothing;

-- ── 12. Itens — Seção 10: Documentos ──────────────────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee1001-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0010-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Manual de Boas Práticas de Fabricação e POPs atualizado, formalizado e implementado?',
   true, 0, false, 1)
on conflict (id) do nothing;

-- ── 13. Itens — Seção 11: Minibar ─────────────────────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c3ee1101-9c0b-4ef8-bb6d-6bb9bd380f00',
   'b3ee0011-9c0b-4ef8-bb6d-6bb9bd380f00',
   'Minibar abastecido e de acordo com o padrão da rede - quando aplicável?',
   true, 0, false, 1)
on conflict (id) do nothing;
