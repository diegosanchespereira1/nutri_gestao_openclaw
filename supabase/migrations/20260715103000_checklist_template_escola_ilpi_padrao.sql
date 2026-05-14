-- Checklist padrão Escola / ILPI (fonte: lista operacional interna; doc de referência em docs/Checklists/).
-- 58 quesitos; texto = lista operacional (prefixo [n] no catálogo).
-- Secções 1.–8. no título. IDs estáveis: uuid v5 no namespace e8c4f2a0-9c0b-4ef8-bb6d-6bb9bd380e00.

insert into public.checklist_templates (
  id, name, portaria_ref, uf, applies_to, description, version, is_active
) values (
  'bd618d62-2643-53a0-a096-0678f07a2697'::uuid,
  'Checklist padrão — Escola e ILPI',
  'Material interno / operacional',
  '*',
  array['escola', 'lar_idosos']::text[],
  $desc$
Checklist operacional para avaliação de boas práticas em serviços de alimentação em escolas e Instituições de Longa Permanência para Idosos (ILPI).

Fonte: lista operacional «Escola / ILPI» (58 quesitos). O rodapé do material original recomenda atingir 80% de adequação.
$desc$,
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
  ('61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '1. Ambiente', 0),
  ('af57fd73-e307-59ec-9706-62c192abff61'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '2. Equipamentos', 1),
  ('7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '3. Utensílios', 2),
  ('d21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '4. Manipuladores de alimentos', 3),
  ('a520a42e-73c9-58fc-b77e-9b0a20464ee3'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '5. Recebimento de mercadorias', 4),
  ('28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '6. Local de armazenamento dos produtos', 5),
  ('8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '7. Produção', 6),
  ('0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, 'bd618d62-2643-53a0-a096-0678f07a2697'::uuid, '8. Documentos', 7)
on conflict (id) do update set
  template_id = excluded.template_id,
  title = excluded.title,
  position = excluded.position;

insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  -- Ambiente [1]–[11]
  ('1ad59eab-fe28-5cd2-9460-dc45cffd9204'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[1] Organizado e limpo', true, 0, false, 1),
  ('f51bd06e-af01-5a78-b497-62888dd9a62c'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[2] Sem objetos em desuso', true, 1, false, 1),
  ('13fd4b98-6937-5e7c-a8ea-fc2638b5b763'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[3] Luminárias protegidas ou de led', true, 2, false, 1),
  ('70b3e70d-c77b-543d-9fb5-811058b3d810'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[4] Piso e ralo limpos e em bom estado de conservação', true, 3, false, 1),
  ('e38f9341-b029-5d21-a141-7b702f295c11'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[5] Paredes e portas limpas e em bom estado de conservação', true, 4, false, 1),
  ('9f174375-8cf7-5bc4-96c3-50606024faef'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[6] Janelas e tela milimétricas limpas e em bom estado de conservação', true, 5, false, 1),
  ('c0408a93-2a75-573f-9b75-b2b60d5d11eb'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[7] Prateleiras, armários (gabinetes), gavetas, limpos e em bom estado de conservação', true, 6, false, 1),
  ('c5bdf4e7-fa87-5808-a9ce-350eb0563ce6'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[8] Sifão limpo e não está em contato com utensílios', true, 7, false, 1),
  ('4df7ca69-71bc-5cea-b9e3-4e3ad4c41908'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[9] Lixeiras limpas, com tampa e acionamento no pedal', true, 8, false, 1),
  ('560aa090-f50c-5b4c-b0b9-487ad0ffbd62'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[10] Pia exclusiva de higienização de mãos ', true, 9, false, 1),
  ('c0087977-f374-5e89-94da-6bdda627a15a'::uuid, '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, '[11] Planilha de higiene devidamente preenchida', true, 10, false, 1),
  -- Equipamentos [12]–[18]
  ('c257b569-fae9-5d0b-a2fa-d37a392c6b26'::uuid, 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, '[12] Pias e bancadas organizadas e limpas', true, 0, false, 1),
  ('b1c48df8-fbf2-5ead-852e-241cfa48611b'::uuid, 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, '[13] Geladeiras e freezers organizados e limpos ', true, 1, false, 1),
  ('ab19989d-a31a-5d2c-af32-2c3d01790ceb'::uuid, 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, '[14] Fogão e forno limpos e em bom estado de conservação', true, 2, false, 1),
  ('1fe60047-8d40-5046-8287-e5d63f7ec9ec'::uuid, 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, '[15] Forno de micro-ondas limpo e em bom estado de conservação', true, 3, false, 1),
  ('c2373520-39af-57fd-ab7d-143f0b0ae25d'::uuid, 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, '[16] Coifa ou Sistema de exaustão limpo e em bom estado de conservação', true, 4, false, 1),
  ('46e3cbb6-afa5-5e3c-b714-6186b34f649b'::uuid, 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, '[17] Liquidificador, batedeira, mixer limpos e em bom estado de conservação', true, 5, false, 1),
  ('5259301b-5ca7-5ee3-ab0f-b8343cd11c8e'::uuid, 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, '[18] Planilha de temperatura de equipamentos devidamente preenchida', true, 6, false, 1),
  -- Utensílios [19]–[22]
  ('b49e18cc-e1cf-51ff-9e92-2de659527071'::uuid, '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, '[19] Organizados e limpos', true, 0, false, 1),
  ('8ff636a1-4b3f-5b24-a32f-ac3b3868a68d'::uuid, '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, '[20] Utensílios de material lavável e mantidos em bom estado de conservação', true, 1, false, 1),
  ('fecb04fe-c4dc-54b2-8f59-05c2fd78c256'::uuid, '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, '[21] Utilização de álcool 70% após lavagem', true, 2, false, 1),
  ('b36d6cff-65c4-558a-9076-eae4b817148b'::uuid, '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, '[22] Utensílios plásticos sanitizados e em bom estado de conservação', true, 3, false, 1),
  -- Manipuladores [23]–[27]
  ('d58f5d88-7290-5c84-ac24-b0c2539cb283'::uuid, 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, '[23] Uniformes adequados e limpos', true, 0, false, 1),
  ('a67aeba0-2be7-5d49-b8d3-0bbb0c5aa7db'::uuid, 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, '[24] Utilização de touca', true, 1, false, 1),
  ('9b8c80a9-2177-58cd-aa98-a8bdf182b7e5'::uuid, 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, '[25] Ausência de adornos (aliança, anéis, brincos, entre outros.) e barba aparada', true, 2, false, 1),
  ('cdff46f2-a94d-5dc0-b514-633a891cbfa8'::uuid, 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, '[26] Mãos limpas, unhas curtas, sem esmalte', true, 3, false, 1),
  ('578f977a-51f8-5544-b45f-e5d5739e6962'::uuid, 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, '[27] Lavagem de mãos adequada', true, 4, false, 1),
  -- Recebimento [28]–[29]
  ('bd5ab6eb-df28-5c83-8927-d534b70f5084'::uuid, 'a520a42e-73c9-58fc-b77e-9b0a20464ee3'::uuid, '[28] Recebimento adequado de mercadorias', true, 0, false, 1),
  ('f71a3d27-26ee-59d8-8fbe-d24bb3f87983'::uuid, 'a520a42e-73c9-58fc-b77e-9b0a20464ee3'::uuid, '[29] Planilha de recebimento devidamente preenchida', true, 1, false, 1),
  -- Armazenamento [30]–[37]
  ('3e69574c-6a17-5041-bad2-4c9dabcbde5c'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[30] Produtos organizados e setorizados', true, 0, false, 1),
  ('4dbe7192-de66-5028-992d-9cbd58e98e01'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[31] Sistema PVPS ', true, 1, false, 1),
  ('632d6540-ce55-5311-9666-a769e9ab0679'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[32] Armazenamento adequado à temperatura e tipo de alimento', true, 2, false, 1),
  ('59cce2e8-b177-5db9-b0bb-d8edf0209341'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[33] Identificados corretamente', true, 3, false, 1),
  ('2308e916-b1c5-54e3-8f23-99428bf146c4'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[34] Produtos com prazo de validade adequado', true, 4, false, 1),
  ('4c6a4edf-603c-5b20-9890-96ccbffb1778'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[35] Produtos mantidos em prateleiras ou sobre os paletes ou estrados', true, 5, false, 1),
  ('1269861d-b80b-5efc-81cf-14554bd64a55'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[36] Produtos mantidos em embalagens íntegras ', true, 6, false, 1),
  ('1eb15844-e369-5ab2-b466-3b9225e277dd'::uuid, '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, '[37] Produtos de limpeza armazenados em local exclusivo', true, 7, false, 1),
  -- Produção [38]–[46]
  ('586e9ea3-34d8-5386-8332-d42bfd377ce8'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[38] Cardápio exposto e sendo cumprido', true, 0, false, 1),
  ('da5a0fb2-8048-5139-baba-cb4a2b3bfe81'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[39] Porcionamento adequado', true, 1, false, 1),
  ('5525dce1-f3e2-5b23-b5f8-8056db462c62'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[40] Higienização de hortifrutis', true, 2, false, 1),
  ('7af72412-ffa1-5442-b357-3f0659849771'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[41] Processo de descongelamento e/ou dessalgue', true, 3, false, 1),
  ('26a78bc5-9bfc-5603-a5fe-25c2594dbd75'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[42] Manipulação atende às boas práticas e previne contaminação cruzada', true, 4, false, 1),
  ('172c45e9-b335-5c6b-927f-cb3cd338ac25'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[43] Local adequado para manipulação de mamadeiras ou dieta enteral', true, 5, false, 1),
  ('c1f58345-4b04-57ea-a9ff-ece18af09fd6'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[44] Planilha de controle de temperatura dos alimentos', true, 6, false, 1),
  ('33e9be7f-e5dc-5e13-b6a3-4d9a224b07be'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[45] Amostras dos alimentos', true, 7, false, 1),
  ('b1ec7631-e670-5eb1-a2fd-8098688d3d63'::uuid, '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, '[46] Utilização de panos descartáveis', true, 8, false, 1),
  -- Documentos [47]–[58]
  ('950f280e-7f58-530c-a1c8-5270ccb855a9'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[47] Manual de Boas Práticas de Manipulação e POP', true, 0, false, 1),
  ('e7e61e9a-e4d7-585b-96dc-71e80b8bfe95'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[48] Atestado de Saúde Ocupacional vigente', true, 1, false, 1),
  ('056c77a3-271f-5a48-a339-09bece12bb75'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[49] PCMSO, PGR e LTCAT ', true, 2, false, 1),
  ('d00725d2-ac41-5b35-95af-aadb26eb4ef8'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[50] Certificado de Controle Integrado de Pragas', true, 3, false, 1),
  ('93722e9d-5fc8-56f8-b43a-bcb9da4b8396'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[51] Certificado de Higiene de Caixa D''agua', true, 4, false, 1),
  ('10ad27ad-e9e9-550c-a71a-df7c8b874e75'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[52] Validade dos Filtros', true, 5, false, 1),
  ('1e0fe27f-d4d4-5341-a5c8-00998ad90703'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[53] Análise da água', true, 6, false, 1),
  ('928e5c08-4665-58c6-a857-354ee380f856'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[54] AVCB', true, 7, false, 1),
  ('8c6fc384-3628-5f09-b9ca-af91abdc3404'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[55] Extintores', true, 8, false, 1),
  ('f5cbd9b3-3204-50c8-bc9b-2458cc2bae97'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[56] Calibração de termômetro', true, 9, false, 1),
  ('59ccac5f-6744-5a8f-b1a2-eabb2a799e11'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[57] Licença de funcionamento', true, 10, false, 1),
  ('50a432ba-af7e-508b-bed5-1861b9fcf714'::uuid, '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, '[58] Licença sanitária', true, 11, false, 1)
on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;
