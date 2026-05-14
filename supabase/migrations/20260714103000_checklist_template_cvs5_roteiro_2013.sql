-- Portaria CVS-5/2013 — Roteiro de inspeção (Anexo).
-- Fonte: docs/Checklists/portaria cvs-5_090413.pdf — tabela ITENS DE AVALIAÇÃO.
-- 55 quesitos + 28 agrupadores (is_structure_only). IDs: uuid v5 no namespace f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00.

insert into public.checklist_templates (
  id, name, portaria_ref, uf, applies_to, description, version, is_active
) values (
  'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00'::uuid,
  'Portaria CVS-5/2013 — Roteiro de inspeção (Anexo)',
  'CVS-5/2013',
  'SP',
  array['escola', 'hospital', 'clinica', 'lar_idosos', 'empresa']::text[],
  $cvs5desc$
Roteiro de Inspeção das Boas Práticas em estabelecimentos comerciais de alimentos e serviços de alimentação (Anexo).

Subsídio à fiscalização conforme o anexo da Portaria CVS-5, de 09 de abril de 2013 — DOE de 19/04/2013, nº 73, Seção I, págs. 32–35.

Os itens correspondem à coluna «Itens de avaliação» do roteiro; a coluna «Artigo» remete ao Regulamento Técnico no corpo da portaria.
$cvs5desc$,
  1,
  true
)
on conflict (id) do update set
  name = excluded.name,
  portaria_ref = excluded.portaria_ref,
  uf = excluded.uf,
  applies_to = excluded.applies_to,
  description = excluded.description,
  version = excluded.version,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.checklist_template_sections (id, template_id, title, position)
values
  ('31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00'::uuid, 'II — Higiene e saúde dos funcionários, RT e capacitação', 0),
  ('bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00'::uuid, 'III — Qualidade sanitária da produção de alimentos', 1),
  ('f6f8e69e-077f-5fb3-afa3-fafbf96f9066'::uuid, 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00'::uuid, 'IV — Higienização das instalações e do ambiente', 2),
  ('e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00'::uuid, 'V — Suporte operacional', 3),
  ('db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00'::uuid, 'VI — Qualidade sanitária das edificações e instalações', 4),
  ('447b6316-c0b1-562f-b661-96c15e9da6d5'::uuid, 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380c00'::uuid, 'VII — Documentação e registro das informações', 5)

on conflict (id) do update set
  template_id = excluded.template_id,
  title = excluded.title,
  position = excluded.position;

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('bc54bfb1-d52a-507c-ba62-99b794dd8ebe'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, 'Seção I — Controle de saúde dos funcionários', false, 0, true, 1),
  ('f4eda6dc-8fb0-5500-93dc-96f714287625'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[1] A saúde dos funcionários é comprovada por atestado médico e laudos laboratoriais. (Art. 8º)', true, 1, false, 1),
  ('1d2b1938-f030-569d-8ab2-09477d6f861c'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[2] Os funcionários estão aparentemente saudáveis, observadas as ausências de lesões cutâneas e de sinais e sintomas de infecções respiratórias e oculares. (Art. 9º)', true, 2, false, 1),
  ('aa29e013-91bd-5376-ad32-993aa4bb8fcf'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, 'Seção II — Higiene e segurança dos funcionários', false, 3, true, 1),
  ('1de2106a-d283-59cd-bee0-b5cf7f3b2732'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[3] Os funcionários apresentam-se asseados, com mãos limpas, unhas curtas, sem esmalte ou adornos. (Art. 10)', true, 4, false, 1),
  ('31fa53f6-131d-552e-854a-781e4a99a1a6'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[4] Os funcionários encontram-se com uniformes limpos e com os equipamentos de proteção individual, quando necessários. (Art. 11 e 12)', true, 5, false, 1),
  ('e5662bd3-75d0-5e18-907f-1f3a099d36cb'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[5] Durante as atividades de produção, foram observados hábitos e comportamentos que evitam a contaminação dos alimentos. (Art. 12, 13 e 14)', true, 6, false, 1),
  ('1400032a-f149-5ac1-ae37-5bd520f52791'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[6] Há cartazes educativos sobre a higienização das mãos nas instalações sanitárias e lavatórios. (Art. 15)', true, 7, false, 1),
  ('25ca6102-852d-5cbe-a57f-25535bdee10a'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, 'Seção III — Responsabilidade técnica e capacitação de pessoal', false, 8, true, 1),
  ('c2ea2fb1-9330-5769-b6e5-4eb498f4d1fd'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[7] O estabelecimento possui um responsável técnico comprovadamente capacitado para implantar Boas Práticas. (Art. 16, 17 e 18)', true, 9, false, 1),
  ('62bcf714-e111-5adb-b736-a99a91c7e7f2'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[8] O estabelecimento possui um programa de capacitação do pessoal em Boas Práticas. (Art. 19)', true, 10, false, 1),
  ('a193a16e-e7a7-5f91-bcaf-0bb479f78fcb'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, 'Seção IV — Visitantes', false, 11, true, 1),
  ('98f0cc8e-fc98-5458-8643-f924e9157a8e'::uuid, '31ad966e-9671-58d6-a762-42be03cb27bc'::uuid, '[9] Os visitantes apresentam-se devidamente uniformizados. (Art. 20)', true, 12, false, 1),
  ('a3264258-a884-51c2-bfaf-9d272ad2bc84'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'Seção I — Recepção e controle de mercadorias', false, 0, true, 1),
  ('f1b61b47-a2b0-5628-ac96-1ac1c544eaca'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[10] A recepção de produtos é realizada em local apropriado, com observações sobre a qualidade de: transportadores, embalagens, rotulagens, avaliação sensorial e medições de temperaturas, entre outros. (Art. 21, 22, 23, 24 e 25)', true, 1, false, 1),
  ('a524b8d1-c954-5e4f-a6c7-b2427fcc8e36'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'Seção II — Armazenamento de produtos', false, 2, true, 1),
  ('443bbca3-ff9c-516a-a162-f73dfd2563a6'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[11] Embalagens, matérias-primas, ingredientes, alimentos preparados, que necessitam ou não de refrigeração ou congelamento são identificados, protegidos e armazenados adequadamente, de acordo com suas características e necessidades de localização, organização e controle de temperatura. (Art. 26, 27, 28, 30, 32, 34)', true, 3, false, 1),
  ('01a2ba97-9cb0-5527-aa6a-eece6a5f6f24'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[12] Produtos reprovados com prazo de validade vencido ou para devolução aos fornecedores estão armazenados adequadamente quanto à organização e ao local. (Art. 29)', true, 4, false, 1),
  ('7ff25644-a606-5b30-8049-5ef1ba79f884'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[13] Refrigeradores e freezers estão adequados às necessidades, quanto ao estado de conservação, higienização e controle de temperatura, assim como os volumes e as disposições dos alimentos naqueles equipamentos estão adequados. (Art. 31 e 33)', true, 5, false, 1),
  ('7415a12f-0ba9-5efb-9e71-1b5bb7e566c1'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'Seção III — Pré-preparo dos alimentos', false, 6, true, 1),
  ('5034f084-e64c-5fc6-9c7c-ec654f015a33'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[14] Os procedimentos de pré-preparo evitam a contaminação cruzada entre alimentos crus, semi preparados e prontos ao consumo, e as embalagens dos produtos são higienizadas e adequadas à área de pré-preparo. (Art. 35 e 36)', true, 7, false, 1),
  ('c6c7e628-fa5f-5ba1-a98b-095cd23fe2ea'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[15] O descongelamento e a retirada do sal de produtos são realizados de maneira adequada. (Art. 37 e 38)', true, 8, false, 1),
  ('68e1607e-331e-5528-8de3-822d8a7421b9'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[16] A higienização de hortifrutícolas é realizada em local adequado e conforme as recomendações desta Portaria. Princípios ativos desinfetantes e a concentração de uso encontram-se adequados. (Art. 39)', true, 9, false, 1),
  ('60505912-7c84-52fd-b347-10ae3d039abd'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[17] Há instruções facilmente visíveis e compreensíveis, sobre a higienização dos hortifrutícolas no local dessa operação. (Art. 40)', true, 10, false, 1),
  ('0c95435f-71ad-56c1-be2d-db7c2b4cca1a'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'Seção IV — Preparo dos alimentos', false, 11, true, 1),
  ('6f357bcf-47c1-5c50-be10-da6db422438e'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[18] Os procedimentos de cocção, resfriamento e refrigeração dos alimentos são realizados em locais apropriados e sob controles de tempos e temperaturas adequadas. (Art. 41, 44 e 45)', true, 12, false, 1),
  ('8a28ab5c-e01c-50b7-ba5e-a0c923288f83'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[19] Existe controle de temperatura do procedimento de fritura e as características sensoriais dos óleos utilizados nesse procedimento encontram-se adequadas. (Art. 42)', true, 13, false, 1),
  ('b9114c36-8a99-57f5-90c6-05fe3b5e14e7'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[20] O estabelecimento não oferece aos consumidores ovos crus, nem preparações onde os ovos permanecem crus. O Responsável Técnico conhece as regras sobre a utilização de ovos determinadas nessa Portaria. (Art. 43)', true, 14, false, 1),
  ('dd25f4dd-ab4b-535c-815e-3afff6fb5573'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'Seção V — Distribuição de alimentos preparados', false, 15, true, 1),
  ('1528ce41-b28e-5fa8-b995-45fafe7e3892'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[21] Os alimentos expostos ao consumo imediato encontram-se protegidos e sob adequados critérios de tempo e temperatura de exposição. (Art. 46 e 47)', true, 16, false, 1),
  ('99f3fb98-3eec-501c-ae34-cfe4437a14aa'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[22] A água do balcão térmico encontra-se limpa e sua temperatura é controlada. (Art. 48)', true, 17, false, 1),
  ('e2a96ecd-3d37-53f4-a2d6-2b330a000795'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[23] Os ornamentos e ventiladores da área de consumação encontram-se adequados. (Art. 49)', true, 18, false, 1),
  ('f249b637-417d-52db-a9d2-a9263f251575'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[24] O pagamento de despesas ocorre em local específico e reservado e o funcionário do caixa não manipula os alimentos. (Art. 50)', true, 19, false, 1),
  ('9727f309-a86d-58c9-b759-fc1725e3b325'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[25] A doação de sobras de alimentos, quando realizada observam-se as Boas Práticas. (Art. 51)', true, 20, false, 1),
  ('1d5acab5-7fb8-58d7-bc01-96bed9f9c5aa'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'Seção VI — Guarda de amostras em cozinhas industriais e serviços de alimentação', false, 21, true, 1),
  ('eed64399-8e93-50b7-8c39-0a41de033737'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[26] A cozinha industrial ou o serviço de alimentação guarda amostras das refeições preparadas conforme as determinações desta Portaria. (Art. 52)', true, 22, false, 1),
  ('36532044-787e-5157-a3e7-ecb98eb7fce9'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, 'Seção VII — Transporte de alimentos', false, 23, true, 1),
  ('b7e0c4a8-8399-5f62-9b3f-4ec56e253f1c'::uuid, 'bb0ec8c2-431e-5f70-b87b-ad8cf9d85c90'::uuid, '[27] Os alimentos são transportados de maneira adequada e identificados, em veículos apropriados e higienizados, e em condições adequadas de tempo e temperatura. (Art. 53 a 61)', true, 24, false, 1),
  ('350af488-6e64-538a-b314-844f9aac0063'::uuid, 'f6f8e69e-077f-5fb3-afa3-fafbf96f9066'::uuid, 'Itens de avaliação — Capítulo IV', false, 0, true, 1),
  ('ca850af2-d286-5b84-8e13-1c2cdc053a6f'::uuid, 'f6f8e69e-077f-5fb3-afa3-fafbf96f9066'::uuid, '[28] Os procedimentos de higienização do ambiente e das instalações são adequados e seguem as etapas obrigatórias determinadas nessa Portaria. (Art. 62 e 63)', true, 1, false, 1),
  ('4005d957-4136-5c63-bbcb-658f2cc99cb3'::uuid, 'f6f8e69e-077f-5fb3-afa3-fafbf96f9066'::uuid, '[29] Os produtos saneantes são rotulados, adequados e armazenados separadamente dos alimentos. (Art. 64)', true, 2, false, 1),
  ('888b16a1-1675-5094-ac8c-ca891207954b'::uuid, 'f6f8e69e-077f-5fb3-afa3-fafbf96f9066'::uuid, '[30] Os funcionários que realizam as operações de higienização são capacitados para isso e utilizam equipamentos de proteção individual, quando necessário. (Art. 65)', true, 3, false, 1),
  ('93c1e36c-8a29-5bbf-9bac-2c74481744dd'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, 'Seção I — Abastecimento de água', false, 0, true, 1),
  ('1b7d3a6b-4baf-5aaa-bc98-3b8f4ffc4e61'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[31] A água utilizada no abastecimento da empresa é adequada e sua qualidade é satisfatória, controlada por análise laboratorial periódica, conforme a legislação em vigor. (Art. 66 e 67)', true, 1, false, 1),
  ('310dd13f-6010-5be5-a4d3-c5558d020859'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[32] O reservatório de água está adequado e sua higienização periódica encontra-se documentada. (Art. 68)', true, 2, false, 1),
  ('11ea063c-f78f-5866-9648-ab19d791c259'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[33] O gelo utilizado para entrar em contato com alimentos e bebidas é produzido com água potável e manipulado com higiene. (Art. 69)', true, 3, false, 1),
  ('e3784f56-81d0-5f9e-9d8e-81b404d86d6e'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[34] O vapor em contato com alimentos ou usado para higienização é produzido com água potável, sem produtos químicos que possam provocar contaminação. (Art. 70)', true, 4, false, 1),
  ('37c93106-3a1f-57c9-8f76-2cbedc22dc41'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, 'Seção II — Esgotamento sanitário', false, 5, true, 1),
  ('cd2bad37-7f3e-5ed8-9228-543bb559a2b0'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[35] Há um sistema de esgoto adequado. (Art. 71)', true, 6, false, 1),
  ('ce605936-a623-5548-a513-5796bea76882'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[36] Os despejos das pias de produção passam por caixa de gordura higienizada periodicamente e instalada fora da área de manipulação e armazenamento dos alimentos. Resíduos de óleo da produção não são descartados na rede de esgoto. (Art. 72)', true, 7, false, 1),
  ('3c6d67ee-f287-51d2-8f14-871f63845400'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, 'Seção III — Materiais recicláveis e resíduos sólidos', false, 8, true, 1),
  ('8d3874c8-572e-55e6-9461-5372fa0bda33'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[37] Na área de produção, o lixo é depositado em recipientes com tampas acionadas por pedal, sem contato manual e é periodicamente retirado de maneira que não provoca contaminação cruzada com alimentos. Os recicláveis e o lixo encontram-se adequadamente armazenados em local que impossibilita atração de vetores e pragas urbanas. (Art. 73 e 74)', true, 9, false, 1),
  ('3099bac7-1f12-5f61-a681-fe7bed3a124e'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, 'Seção IV — Abastecimento de gás', false, 10, true, 1),
  ('4c5f4666-fbbe-56ab-8ee0-65510627c7bc'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[38] A área para armazenamento de gás é instalada em local ventilado e protegido. (Art. 75)', true, 11, false, 1),
  ('27bf4b0b-a57b-5cf0-9885-efef7b422896'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, 'Seção V — Controle integrado de vetores e pragas urbanas', false, 12, true, 1),
  ('5be116d9-d451-5273-b5cb-0ba81c566c5a'::uuid, 'e04b07e8-8464-5e66-be8e-33a5e9d4d504'::uuid, '[39] Existem procedimentos para o controle de pragas e vetores urbanos. Há comprovação dos serviços efetuados por empresa licenciada no órgão competente de vigilância sanitária. (Art. 76)', true, 13, false, 1),
  ('1cb28511-e75d-5233-8a82-5050dacac59a'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção I — Localização', false, 0, true, 1),
  ('948f79f6-f134-5561-aac7-715dbe54447d'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[40] Área externa livre de focos de insalubridade, ausência de lixo e objetos em desuso, livre de focos de vetores, animais domésticos e roedores. Acesso independente, não comum a habitação e outros usos. (Art. 77)', true, 1, false, 1),
  ('c63ffe57-ff03-531c-9da2-e83b4cef4eb9'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção II — Instalações', false, 2, true, 1),
  ('064e2ac4-e4e8-5cda-a4a8-5c4448cc635c'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[41] As instalações são separadas por meios físicos que facilitam higienização e a produção ocorre em fluxo contínuo e não promove contaminação cruzada. Existem locais específicos para pré-preparo e para preparo. O dimensionamento das instalações é proporcional ao volume de produção. (Art. 78 e 79)', true, 3, false, 1),
  ('4ac423de-169a-51c7-afb8-cc3c22aeb3da'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[42] As reformas são executadas fora do horário de manipulação dos alimentos. (Art. 79)', true, 4, false, 1),
  ('c110cbff-0e5d-5db5-85b4-88afb00e8130'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[43] Existe lavatório exclusivo para higiene das mãos, com um cartaz educativo sobre isso, em posição estratégica em relação ao fluxo de preparações dos alimentos. (Art. 80)', true, 5, false, 1),
  ('6ca7a659-ab25-5210-b107-3f371a1502fb'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[44] A higienização de materiais de limpeza, tais como baldes, vassouras, pano de chão, entre outros, ocorre em local exclusivo, fora da área de preparo de alimentos. (Art. 81)', true, 6, false, 1),
  ('18987971-ff5e-51a9-b7b1-f9e06896e805'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção III — Equipamentos, utensílios e móveis', false, 7, true, 1),
  ('ae3990d5-1c6a-584c-a6eb-130f4bc0fb65'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[45] Equipamentos, utensílios e móveis são de fácil higienização, não transmitem substâncias tóxicas, odores ou sabores aos alimentos e têm as partes de maior risco protegidas, tais como motor, prensa, peça cortante, sucção, correia e outros. (Art. 82 e 83)', true, 8, false, 1),
  ('5ca75739-2da3-5813-9035-534e78085567'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[46] As câmaras frigoríficas encontram-se adequadas. (Art. 84)', true, 9, false, 1),
  ('13e27b96-43d5-5cd8-aef4-ec3b12e57228'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção IV — Piso', false, 10, true, 1),
  ('2c7780fe-7743-59df-acf7-0ea909397457'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[47] O piso é constituído de material liso, antiderrapante, resistente, impermeável, lavável, íntegro, sem trincas, vazamento e infiltrações. Os ralos são sifonados com dispositivos que permitem seu fechamento. (Art. 85)', true, 11, false, 1),
  ('5c317f3b-faeb-5757-8c2a-ba75e4b11a6c'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção V — Paredes, tetos e forros', false, 12, true, 1),
  ('c0bb531f-d4d0-53b0-b001-e42bf90eb62c'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[48] As paredes e divisórias, assim como tetos e forros são sólidos, com acabamento liso e impermeável. Não possuem vazamentos, umidade, bolores, infiltrações, trincas, rachaduras, descascamento, goteiras, dentre outros. (Art. 86 e 87)', true, 13, false, 1),
  ('be4910fe-49e4-55db-a47a-1fc2a54a9466'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção VI — Portas e janelas', false, 14, true, 1),
  ('23a31af5-ccc0-570a-a00c-b92d540e530e'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[49] As portas são ajustadas aos batentes, de fácil limpeza, possuem mecanismo de fechamento automático e proteção na parte inferior contra insetos e roedores. As janelas são ajustadas aos batentes e protegidas com telas milimétricas removíveis para limpeza. (Art. 88 e 89)', true, 15, false, 1),
  ('67c6a035-6c25-5ab7-823e-8a8edf63d5f8'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção VII — Iluminação', false, 16, true, 1),
  ('9dfdde29-db88-5c53-bcca-9ffef174d26b'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[50] As lâmpadas e luminárias encontram-se protegidas contra quedas acidentais ou explosão. As instalações elétricas são embutidas ou encontram-se protegidas por tubulações presas e distantes das paredes e teto. (Art. 90)', true, 17, false, 1),
  ('dec1d567-0454-58ab-8882-22c20bdb815f'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção VIII — Ventilação', false, 18, true, 1),
  ('a89ad9b2-f1dc-5e41-a7db-15aaa0bbcba8'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[51] O sistema de ventilação da edificação garante conforto térmico, renovação do ar e a manutenção do ambiente livre de fungos, gases, fumaça, gordura e condensação de vapores, dentre outros. A ventilação/exaustão do ar é direcionada da área limpa para a suja. Os exaustores possuem telas milimétricas removíveis para impedir a entrada de vetores e pragas urbanas. Os equipamentos e filtros são higienizados. (Art. 91 e 92)', true, 19, false, 1),
  ('a073f37b-fd22-5a16-afe3-8801dc042bcc'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[52] Não são utilizados ventiladores nem climatizadores com aspersão de neblina sobre os alimentos, ou nas áreas de manipulação e armazenamento. (Art. 93)', true, 20, false, 1),
  ('20d33f6c-2532-588e-bcf7-6084a03eba64'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção IX — Vestiários e instalações sanitárias', false, 21, true, 1),
  ('6c370df0-5926-5c0c-97fa-0eebed13126d'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[53] Os vestiários dos funcionários não se comunicam diretamente com a área de armazenamento, manipulação de alimentos e refeitórios. São separados por gênero, possuem armários individuais, chuveiros e as portas externas são dotadas de fechamento automático. Os banheiros dispõem de bacia sifonada com tampa e descarga, mictório com descarga, papel higiênico, lixeira com tampa acionada por pedal, pias com sabonete ou produto anti-séptico, toalha de papel não reciclado ou outro método de secagem higiênico e seguro. (Art. 94)', true, 22, false, 1),
  ('8f66d58b-a513-562d-b7ed-ef2a246775a6'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, 'Seção X — Área de distribuição e consumo dos alimentos', false, 23, true, 1),
  ('7d3c14ae-161a-5e29-8173-5b4b0ad30218'::uuid, 'db91e8ab-9e65-5fc6-af84-7ade1846c67e'::uuid, '[54] As instalações sanitárias de clientes dispõem de bacia sifonada com tampa e descarga, mictório com descarga, papel higiênico, lixeira com tampa acionada por pedal, lavatórios com sabonete ou produto anti-séptico, toalha de papel não reciclado ou outro método de secagem higiênico e seguro. (Art. 95)', true, 24, false, 1),
  ('7296861d-f281-5d0c-9d41-7f7e0a991302'::uuid, '447b6316-c0b1-562f-b661-96c15e9da6d5'::uuid, 'Seção I — Manual de Boas Práticas e POPs', false, 0, true, 1),
  ('09d82ef9-62f9-55c0-9b7a-3a05cab2d2e6'::uuid, '447b6316-c0b1-562f-b661-96c15e9da6d5'::uuid, '[55] O estabelecimento possui um manual de Boas Práticas e os POPs estabelecidos nesta Portaria, que encontram-se disponíveis aos funcionários e à fiscalização sanitária. (Art. 96)', true, 1, false, 1)

on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;
