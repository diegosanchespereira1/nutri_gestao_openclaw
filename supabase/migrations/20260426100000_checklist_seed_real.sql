-- Migration: insere checklist real importado do arquivo "CHECK LIST PADRÃO 2026.xlsx"
-- (fonte: cliente By Koji Guedala) e arquiva o seed de exemplo anterior.
--
-- Checklist: Segurança e Boas Práticas em Manipulação de Alimentos
-- 5 seções · 43 itens · aplica-se a todos os tipos de estabelecimento (uf = '*').
--
-- IDs fixos para suportar re-run idempotente via ON CONFLICT.
--
-- NOTA: o template de exemplo (a0eebc99-...) NÃO é deletado porque
-- checklist_fill_sessions já pode ter FK para ele. É apenas arquivado
-- (is_active = false) para não aparecer no catálogo de novos preenchimentos.

-- ── 1. Arquivar seed de exemplo (mantém FKs existentes intactas) ─────────────

update public.checklist_templates
  set is_active = false,
      name      = '[ARQUIVADO] Portaria CVS-5/2013 — exemplo didático'
  where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- ── 2. Template real ──────────────────────────────────────────────────────────

insert into public.checklist_templates (
  id, name, portaria_ref, uf, applies_to, description, version, is_active
)
values (
  'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
  'Checklist — Segurança e Boas Práticas em Manipulação de Alimentos',
  'RDC 216/2004 / CVS-5/2013',
  '*',
  array['escola','hospital','clinica','lar_idosos','empresa']::text[],
  'Checklist operacional de boas práticas para serviços de alimentação. '
  'Cobre estrutura, equipamentos, recebimento, manipulação e documentação regulatória.',
  1,
  true
)
on conflict (id) do nothing;

-- ── 3. Seções ─────────────────────────────────────────────────────────────────

insert into public.checklist_template_sections (id, template_id, title, position)
values
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
   'Estrutura, edificação e instalações', 0),

  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
   'Equipamentos, móveis e utensílios', 1),

  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
   'Recebimento e armazenamento', 2),

  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
   'Manipulação e Boas Práticas', 3),

  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380b00',
   'Documentação', 4)
on conflict (id) do nothing;

-- ── 4. Itens — Seção 1: Estrutura, edificação e instalações (8 itens) ─────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0001-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Piso, paredes e teto limpos e em boas condições de conservação',
   true, 0),

  ('c1ee0002-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Iluminação adequada e protegida',
   false, 1),

  ('c1ee0003-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Ventilação adequada',
   false, 2),

  ('c1ee0004-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Janelas com tela milimétrica, limpas e em boas condições de conservação',
   false, 3),

  ('c1ee0005-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Ralos telados/sifonados',
   true, 4),

  ('c1ee0006-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Fluxo operacional adequado',
   false, 5),

  ('c1ee0007-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Setores possuem pia exclusiva para lavagem de mãos, devidamente abastecidas',
   true, 6),

  ('c1ee0008-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
   'Planilha de higiene ambiental preenchida',
   true, 7)
on conflict (id) do nothing;

-- ── 5. Itens — Seção 2: Equipamentos, móveis e utensílios (6 itens) ───────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0009-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
   'Equipamentos íntegros e limpos',
   true, 0),

  ('c1ee0010-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
   'Utensílios limpos, organizados e em bom estado de conservação',
   true, 1),

  ('c1ee0011-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
   'Bancadas e superfícies limpas e em boas condições de conservação',
   true, 2),

  ('c1ee0012-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
   'Termômetros funcionando',
   true, 3),

  ('c1ee0013-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
   'Planilha de controle de temperatura preenchida',
   true, 4),

  ('c1ee0014-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b02',
   'Lixeira limpa, com tampa e acionamento por pedal',
   false, 5)
on conflict (id) do nothing;

-- ── 6. Itens — Seção 3: Recebimento e armazenamento (5 itens) ────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0015-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'Planilha de recebimento preenchida',
   true, 0),

  ('c1ee0016-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'Produtos dentro da validade',
   true, 1),

  ('c1ee0017-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'Armazenamento seco organizado',
   false, 2),

  ('c1ee0018-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'Armazenamento refrigerado adequado',
   true, 3),

  ('c1ee0019-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b03',
   'PVPS (Primeiro que Vence, Primeiro que Sai) aplicado',
   true, 4)
on conflict (id) do nothing;

-- ── 7. Itens — Seção 4: Manipulação e Boas Práticas (9 itens) ────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0020-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Higiene das mãos adequada',
   true, 0),

  ('c1ee0021-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Fluxo que evita contaminação cruzada',
   true, 1),

  ('c1ee0022-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Uso correto de EPI (Equipamento de Proteção Individual)',
   true, 2),

  ('c1ee0023-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Controle Tempo × Temperatura (T×T°C)',
   true, 3),

  ('c1ee0024-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Identificação e validade dos produtos em uso',
   true, 4),

  ('c1ee0025-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Produtos protegidos adequadamente',
   false, 5),

  ('c1ee0026-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Uso de uniforme completo e em boas condições de conservação e higiene',
   true, 6),

  ('c1ee0027-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Asseio pessoal adequado',
   true, 7),

  ('c1ee0028-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b04',
   'Resíduos descartados adequadamente',
   false, 8)
on conflict (id) do nothing;

-- ── 8. Itens — Seção 5: Documentação (15 itens) ──────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position)
values
  ('c1ee0029-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Manual de Boas Práticas de Fabricação (BPF) e POPs atualizados',
   true, 0),

  ('c1ee0030-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Treinamento de manipuladores atualizado',
   true, 1),

  ('c1ee0031-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Atestado de Saúde Ocupacional (ASO) — anual',
   true, 2),

  ('c1ee0032-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'PGR, PCMSO e LTCAT — anual',
   true, 3),

  ('c1ee0033-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Certificado de Controle Integrado de Pragas (DDD) — trimestral',
   true, 4),

  ('c1ee0034-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'FDS (Fichas de Dados de Segurança) dos produtos químicos atualizadas',
   false, 5),

  ('c1ee0035-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Higienização da caixa d''água — semestral',
   true, 6),

  ('c1ee0036-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Análise de água realizada',
   false, 7),

  ('c1ee0037-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Troca da vela do filtro em dia',
   false, 8),

  ('c1ee0038-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Limpeza da coifa realizada',
   false, 9),

  ('c1ee0039-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Extintores dentro da validade e com carga',
   true, 10),

  ('c1ee0040-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Calibração do termômetro em dia',
   true, 11),

  ('c1ee0041-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'Licença de funcionamento válida',
   true, 12),

  ('c1ee0042-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'CMVS (Cadastro Municipal de Vigilância Sanitária) válido',
   true, 13),

  ('c1ee0043-9c0b-4ef8-bb6d-6bb9bd380b00',
   'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b05',
   'AVCB (Auto de Vistoria do Corpo de Bombeiros) válido',
   true, 14)
on conflict (id) do nothing;
