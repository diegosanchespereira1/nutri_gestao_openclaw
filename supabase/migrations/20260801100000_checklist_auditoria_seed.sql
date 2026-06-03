-- Migration: insere checklist "Checklist Auditoria" importado do arquivo "Check List AuditoriaV1.xlsx"
-- 6 seções · subseções como is_structure_only=true · aplica-se a todos os tipos de estabelecimento (uf = '*').
-- IDs fixos para suportar re-run idempotente via ON CONFLICT.

-- ── 1. Template ───────────────────────────────────────────────────────────────

insert into public.checklist_templates (
  id, name, portaria_ref, uf, applies_to, description, version, is_active
)
values (
  'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00',
  'Checklist Auditoria',
  'RDC 216/2004 / CVS-5/2013',
  '*',
  array['escola','hospital','clinica','lar_idosos','empresa','industria']::text[],
  'Checklist de auditoria para serviços e indústrias alimentícias. '
  'Cobre edificações, equipamentos, manipuladores, produção, transporte, '
  'controle de qualidade e documentação regulatória.',
  1,
  true
)
on conflict (id) do nothing;

-- ── 2. Seções ─────────────────────────────────────────────────────────────────

insert into public.checklist_template_sections (id, template_id, title, position)
values
  ('b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00',
   '1. Edificações e Instalações', 0),

  ('b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00',
   '2. Equipamentos, Móveis e Utensílios', 1),

  ('b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00',
   '3. Manipuladores', 2),

  ('b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00',
   '4. Produção e Transporte do Alimento', 3),

  ('b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00',
   '5. Controle de Qualidade e Segurança dos Alimentos', 4),

  ('b2ee0006-9c0b-4ef8-bb6d-6bb9bd380c00',
   'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00',
   '6. Documentos', 5)
on conflict (id) do nothing;

-- ── 3. Itens — Seção 1: Edificações e Instalações ────────────────────────────
-- Subseções intercaladas como is_structure_only = true

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  -- Subseção
  ('c2ee0100-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Higienização das instalações', false, 0, true, 1),
  -- Item 1
  ('c2ee0101-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe um programa de higienização elaborado e efetivamente realizado com registro, frequência e responsável?',
   true, 1, false, 1),

  -- Subseção
  ('c2ee0110-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Áreas externas', false, 2, true, 1),
  -- Item 2
  ('c2ee0102-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'A área externa está localizada em área que não oferece risco de infestações e contaminação, livre de materiais em desuso e sucata?',
   true, 3, false, 1),

  -- Subseção
  ('c2ee0120-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Instalações', false, 4, true, 1),
  -- Itens 3-4
  ('c2ee0103-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'As áreas internas são organizadas e sem materiais em desuso ou sucata?',
   true, 5, false, 1),
  ('c2ee0104-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'A empresa possui instalações dispostas em áreas específicas e adequadas para armazenamento, processamento e expedição?',
   true, 6, false, 1),

  -- Subseção
  ('c2ee0130-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Instalações (Piso, teto, paredes, divisórias, portas e janelas)', false, 7, true, 1),
  -- Item 5
  ('c2ee0105-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'As instalações são constituídas de materiais que facilitem a higienização, estão em bom estado de conservação e são adequadas ao processamento higiênico e seguro dos produtos?',
   true, 8, false, 1),

  -- Subseção
  ('c2ee0140-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Piso', false, 9, true, 1),
  -- Item 6
  ('c2ee0106-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Possui sistema adequado de drenagem? Ralos/canaletas devem ser evitados na produção; se houver, possuem sistema de fechamento?',
   true, 10, false, 1),

  -- Subseção
  ('c2ee0150-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Paredes e divisórias', false, 11, true, 1),
  -- Item 7
  ('c2ee0107-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existem ângulos abaulados entre as paredes e o piso e entre as paredes e os tetos?',
   false, 12, false, 1),

  -- Subseção
  ('c2ee0160-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Portas', false, 13, true, 1),
  -- Item 8
  ('c2ee0108-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Portas externas com fechamento automático (mola, sistema eletrônico ou outro) e com barreiras adequadas para impedir a entrada de vetores e outros animais (telas milimétricas ou outro sistema)?',
   true, 14, false, 1),

  -- Subseção
  ('c2ee0170-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Janelas', false, 15, true, 1),
  -- Item 9
  ('c2ee0109-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe proteção contra a entrada de vetores nas janelas (telas milimétricas)?',
   true, 16, false, 1),

  -- Subseção
  ('c2ee0180-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Instalações sanitárias e vestiários para os manipuladores', false, 17, true, 1),
  -- Itens 10-15
  ('c2ee0111-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'As instalações sanitárias são constituídas de materiais que facilitem a higienização, estão em bom estado de organização e conservação?',
   true, 18, false, 1),
  ('c2ee0112-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Ausência de comunicação direta (incluindo sistema de exaustão) com a área de trabalho e de refeições? Quando localizados isolados da área de produção, o acesso é realizado por passagens cobertas e calçadas?',
   true, 19, false, 1),
  ('c2ee0113-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Instalações sanitárias separadas por sexo, com instalações (mictórios, vasos, lavatórios, chuveiros e armários) em proporção adequada?',
   true, 20, false, 1),
  ('c2ee0114-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Lavatórios em condições de higiene, dotados de sabonete líquido inodoro antisséptico, toalhas de papel não reciclado ou outro sistema higiênico e seguro de secagem, e lixeiras acionadas sem contato manual?',
   true, 21, false, 1),
  ('c2ee0115-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Portas das instalações sanitárias com fechamento automático (mola, sistema eletrônico ou outro)?',
   true, 22, false, 1),
  ('c2ee0116-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Presença de avisos com os procedimentos para lavagem de mãos?',
   true, 23, false, 1),

  -- Subseção
  ('c2ee0190-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Lavatórios na área de produção', false, 24, true, 1),
  -- Itens 16-17
  ('c2ee0117-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'O setor de produção possui lavatórios em posições adequadas em relação ao fluxo de produção, dotados preferencialmente de torneira com acionamento automático, em número suficiente para atender toda a área de produção?',
   true, 25, false, 1),
  ('c2ee0118-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Lavatórios da área de produção em condições de higiene, dotados de sabonete líquido inodoro antisséptico, toalhas de papel não reciclado ou outro sistema higiênico e seguro de secagem, e lixeiras acionadas sem contato manual?',
   true, 26, false, 1),

  -- Subseção
  ('c2ee01a0-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Iluminação e instalação elétrica', false, 27, true, 1),
  -- Itens 18-19
  ('c2ee0119-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'A iluminação (natural ou artificial) é adequada à atividade desenvolvida? Sem ofuscamento, reflexos fortes, sombras e contrastes excessivos?',
   true, 28, false, 1),
  ('c2ee011a-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'As luminárias possuem proteção adequada contra quebras e estão em adequado estado de funcionamento e conservação?',
   true, 29, false, 1),

  -- Subseção
  ('c2ee01b0-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Esgotamento sanitário', false, 30, true, 1),
  -- Item 20
  ('c2ee011b-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0001-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Fossas, esgoto conectado à rede pública e caixas de gordura estão em adequado estado de conservação e funcionamento?',
   true, 31, false, 1)
on conflict (id) do nothing;

-- ── 4. Itens — Seção 2: Equipamentos, Móveis e Utensílios ────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  -- Subseção
  ('c2ee0200-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Equipamentos, móveis e utensílios', false, 0, true, 1),
  -- Itens 1-2
  ('c2ee0201-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Os equipamentos são constituídos de materiais que facilitem a higienização, estão em bom estado de conservação e funcionamento, e são adequados ao processamento higiênico e seguro dos produtos?',
   true, 1, false, 1),
  ('c2ee0202-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe um programa de higienização de equipamentos, móveis e utensílios elaborado e efetivamente realizado? Com registro, frequência e responsável?',
   true, 2, false, 1),

  -- Subseção
  ('c2ee0210-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Manutenção preventiva', false, 3, true, 1),
  -- Item 3
  ('c2ee0203-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe procedimento implantado e registros que comprovem que os equipamentos e maquinários passam por manutenção preventiva?',
   true, 4, false, 1),

  -- Subseção
  ('c2ee0220-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Calibração', false, 5, true, 1),
  -- Item 4
  ('c2ee0204-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0002-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe procedimento implantado e registros que comprovem a calibração dos instrumentos e equipamentos de medição, ou comprovante de execução do serviço quando a calibração for realizada por empresas terceirizadas?',
   true, 6, false, 1)
on conflict (id) do nothing;

-- ── 5. Itens — Seção 3: Manipuladores ────────────────────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  -- Subseção
  ('c2ee0300-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Vestuário', false, 0, true, 1),
  -- Itens 1-2
  ('c2ee0301-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Colaboradores utilizam uniforme e EPIs de trabalho adequados à atividade, exclusivos para a área de produção e em bom estado de conservação?',
   true, 1, false, 1),
  ('c2ee0302-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Manipuladores apresentam: mãos limpas, unhas curtas, sem esmalte, sem adornos (anéis, pulseiras, brincos, etc.), barbeados, com uso de touca e/ou máscara?',
   true, 2, false, 1),

  -- Subseção
  ('c2ee0310-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Hábitos higiênicos', false, 3, true, 1),
  -- Itens 3-4
  ('c2ee0303-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Os manipuladores lavam as mãos antes da manipulação de alimentos, principalmente após qualquer interrupção e depois do uso de sanitários?',
   true, 4, false, 1),
  ('c2ee0304-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Cartazes de orientação aos manipuladores sobre a correta lavagem das mãos e demais hábitos de higiene estão afixados em locais apropriados?',
   false, 5, false, 1),

  -- Subseção
  ('c2ee0320-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Programa de controle e saúde', false, 6, true, 1),
  -- Item 5
  ('c2ee0305-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0003-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe avaliação periódica do estado de saúde dos manipuladores? Há registros dos exames realizados?',
   true, 7, false, 1)
on conflict (id) do nothing;

-- ── 6. Itens — Seção 4: Produção e Transporte do Alimento ────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  -- Subseção
  ('c2ee0400-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Recebimento', false, 0, true, 1),
  -- Itens 1-5
  ('c2ee0401-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe procedimento de recebimento com inspeção e registro em planilha de controle? (temperatura, características sensoriais, condições de transporte, entre outros)',
   true, 1, false, 1),
  ('c2ee0402-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Matérias-primas e ingredientes aguardando liberação e aqueles aprovados estão devidamente identificados e acondicionados?',
   true, 2, false, 1),
  ('c2ee0403-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Matérias-primas, ingredientes e embalagens reprovados no controle efetuado na recepção são devolvidos imediatamente ou identificados e armazenados em local separado?',
   true, 3, false, 1),
  ('c2ee0404-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'O armazenamento é realizado em local adequado e organizado? Sobre estrados, distantes do piso, ou sobre paletes bem conservados e limpos, ou sobre outro sistema aprovado, afastados das paredes e distantes do teto, de forma que permita apropriada higienização, iluminação e circulação de ar?',
   true, 4, false, 1),
  ('c2ee0405-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'O uso das matérias-primas, ingredientes e embalagens respeita a ordem de entrada (PVPS — Primeiro que Vence é o Primeiro que Sai)?',
   true, 5, false, 1),

  -- Subseção
  ('c2ee0410-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Fluxo de produção', false, 6, true, 1),
  -- Itens 6-7
  ('c2ee0406-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'O processo produtivo segue o fluxo linear, ordenado de modo que não ocorra risco de contaminação cruzada?',
   true, 7, false, 1),
  ('c2ee0407-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Separação das áreas (pré-preparo, preparo e áreas de lavagem) por barreira física ou técnica?',
   true, 8, false, 1),

  -- Subseção
  ('c2ee0420-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Rotulagem e armazenamento do produto final', false, 9, true, 1),
  -- Itens 8-13
  ('c2ee0408-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Os dizeres de rotulagem estão com identificação visível e de acordo com a legislação vigente?',
   true, 10, false, 1),
  ('c2ee0409-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe metodologia estabelecida de inspeção do produto final, com inspeção antes da liberação?',
   true, 11, false, 1),
  ('c2ee040a-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Os produtos estão armazenados separados por tipo ou grupo, sobre estrados, distantes do piso, ou sobre paletes bem conservados e limpos, afastados das paredes e distantes do teto, de forma a permitir apropriada higienização, iluminação e circulação de ar?',
   true, 12, false, 1),
  ('c2ee040b-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe controle adequado do produto final? (Shelf-life ou análise sensorial)',
   true, 13, false, 1),
  ('c2ee040c-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe programa de amostragem para análise laboratorial do produto final?',
   true, 14, false, 1),
  ('c2ee040d-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe laudo laboratorial atestando o controle de qualidade do produto final, assinado pelo técnico da empresa responsável pela análise ou expedido por empresa terceirizada?',
   true, 15, false, 1),

  -- Subseção
  ('c2ee0430-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Transporte do produto final', false, 16, true, 1),
  -- Item 14
  ('c2ee040e-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'O transporte do produto final é realizado em veículos apropriados? Veículo limpo, não transporta outras cargas que comprometam a segurança do produto?',
   true, 17, false, 1),

  -- Subseção
  ('c2ee0440-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Rastreabilidade', false, 18, true, 1),
  -- Item 15
  ('c2ee040f-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe sistemática de identificação do produto durante todo o processo, permitindo sua rastreabilidade?',
   true, 19, false, 1),

  -- Subseção
  ('c2ee0450-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Programa de recolhimento', false, 20, true, 1),
  -- Item 16
  ('c2ee0416-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe sistemática de recolhimento para o caso de falhas detectadas no produto expedido? A mesma é testada?',
   true, 21, false, 1),

  -- Subseção
  ('c2ee0460-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Serviço de atendimento ao consumidor (SAC)', false, 22, true, 1),
  -- Item 17
  ('c2ee0417-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe procedimento de atendimento ao consumidor (SAC) com tratativas de recolhimento, troca e análise da não conformidade?',
   true, 23, false, 1),

  -- Subseção
  ('c2ee0470-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Seleção de fornecedores', false, 24, true, 1),
  -- Item 18
  ('c2ee0418-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existem critérios estabelecidos para seleção dos fornecedores de matérias-primas?',
   true, 25, false, 1),

  -- Subseção
  ('c2ee0480-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Controle integrado de vetores e pragas urbanas', false, 26, true, 1),
  -- Itens 19-20
  ('c2ee0419-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Há um programa de controle de pragas documentado e implantado, dotado de medidas preventivas e corretivas?',
   true, 27, false, 1),
  ('c2ee041a-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Em caso de adoção de controle terceirizado de pragas, existe comprovante de execução do serviço e monitoramento expedido por empresa especializada?',
   false, 28, false, 1),

  -- Subseção
  ('c2ee0490-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Abastecimento de água', false, 29, true, 1),
  -- Itens 21-22
  ('c2ee041b-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Há um programa de controle de higienização do reservatório de água (frequência, métodos e produtos) devidamente registrado, com comprovante de execução de serviços? O responsável é comprovadamente capacitado?',
   true, 30, false, 1),
  ('c2ee041c-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'A potabilidade da água é atestada por meio de laudos laboratoriais, com adequada periodicidade, assinados por técnico responsável pela análise ou expedidos por empresa terceirizada? Com coleta realizada por técnico comprovadamente capacitado?',
   true, 31, false, 1),

  -- Subseção
  ('c2ee04a0-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Manejo de resíduos', false, 32, true, 1),
  -- Itens 23-24
  ('c2ee041d-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe procedimento documentado e implantado de manejo de resíduos?',
   true, 33, false, 1),
  ('c2ee041e-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0004-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Há evidências da frequência e realização da retirada dos resíduos da área de processamento, evitando focos de contaminação?',
   true, 34, false, 1)
on conflict (id) do nothing;

-- ── 7. Itens — Seção 5: Controle de Qualidade e Segurança dos Alimentos ──────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  -- Subseção
  ('c2ee0500-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Documentações', false, 0, true, 1),
  -- Itens 1-2
  ('c2ee0501-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'A empresa possui documentos pertinentes à regularização atualizados (Licença de Funcionamento, Licença Sanitária, AVCB)?',
   true, 1, false, 1),
  ('c2ee0502-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'A empresa possui responsável técnico legalmente habilitado?',
   true, 2, false, 1),

  -- Subseção
  ('c2ee0510-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Sistema de qualidade', false, 3, true, 1),
  -- Item 3
  ('c2ee0503-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'O sistema de qualidade é adequado e atende às necessidades de controle e garantia relacionados à qualidade do produto?',
   true, 4, false, 1),

  -- Subseção
  ('c2ee0520-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Plano de controle do produto acabado', false, 5, true, 1),
  -- Itens 4-7
  ('c2ee0504-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'São realizadas análises físico-químicas, microbiológicas e organolépticas para aprovação de cada lote fabricado?',
   true, 6, false, 1),
  ('c2ee0505-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'São emitidos laudos para análises realizadas?',
   true, 7, false, 1),
  ('c2ee0506-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Os laudos emitidos são enviados juntamente com a mercadoria do cliente referente ao lote entregue?',
   true, 8, false, 1),
  ('c2ee0507-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'As análises são realizadas em laboratório interno? Caso seja em laboratório terceirizado, qual é o laboratório? Tem documentação que comprove a veracidade do laboratório?',
   true, 9, false, 1),

  -- Subseção
  ('c2ee0530-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Manual de Boas Práticas de Fabricação', false, 10, true, 1),
  -- Itens 8-10
  ('c2ee0508-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe Manual de Boas Práticas de Fabricação implantado, atualizado e condizente com a realidade da empresa?',
   true, 11, false, 1),
  ('c2ee0509-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'As operações executadas no estabelecimento estão de acordo com o Manual de Boas Práticas de Fabricação?',
   true, 12, false, 1),
  ('c2ee050a-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Existe programa de capacitação adequado e contínuo sobre Boas Práticas de Fabricação? Há evidências deste treinamento? (lista de presença com data e tempo de treinamento)',
   true, 13, false, 1),

  -- Subseção
  ('c2ee0540-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Análise de Perigos e Pontos Críticos de Controle', false, 14, true, 1),
  -- Item 11
  ('c2ee050b-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0005-9c0b-4ef8-bb6d-6bb9bd380c00',
   'A empresa possui APPCC implantado e adequado ao processo? Os PCCs são identificados e monitorados? Há registros?',
   true, 15, false, 1)
on conflict (id) do nothing;

-- ── 8. Itens — Seção 6: Documentos (sem subseções) ───────────────────────────

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('c2ee0601-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0006-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Atestado de Saúde Ocupacional (ASO) atualizado?',
   true, 0, false, 1),

  ('c2ee0602-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0006-9c0b-4ef8-bb6d-6bb9bd380c00',
   'PGR, PCMSO e LTCAT atualizados?',
   true, 1, false, 1),

  ('c2ee0603-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0006-9c0b-4ef8-bb6d-6bb9bd380c00',
   'FDS (Fichas de Dados de Segurança) dos produtos químicos utilizados atualizadas?',
   true, 2, false, 1),

  ('c2ee0604-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0006-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Limpeza da coifa ou do sistema de exaustão dentro da validade?',
   true, 3, false, 1),

  ('c2ee0605-9c0b-4ef8-bb6d-6bb9bd380c00',
   'b2ee0006-9c0b-4ef8-bb6d-6bb9bd380c00',
   'Plano de Manutenção, Operação e Controle (PMOC) do sistema de climatização atualizado?',
   true, 4, false, 1)
on conflict (id) do nothing;
