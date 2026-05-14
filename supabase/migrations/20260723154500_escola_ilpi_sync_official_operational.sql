-- Escola/ILPI: alinha aos 58 itens da lista operacional interna (texto comunicado pela equipe).
-- Remove linha não prevista («Paletes…» da versão anterior do Word) e «Treinamentos de boas práticas…»
-- (substituídos na fonte oficial por «Sem objetos em desuso» + «Sifão…» nos quesitos 2 e 8 de Ambiente).
-- Texto no BD = apenas prefixo global [n] + texto tal como na lista recebida (sem inclusões extra).

delete from public.checklist_template_items where id = 'a2b311e2-b1f9-5684-9efb-ed2425ea8389'::uuid;
delete from public.checklist_template_items where id = 'ba57d402-50a5-5194-b16d-d5ad39dd6147'::uuid;

insert into public.checklist_template_items (id, section_id, description, is_required, position, is_structure_only, peso)
values
  (
    'f51bd06e-af01-5a78-b497-62888dd9a62c'::uuid,
    '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid,
    '[2] Sem objetos em desuso',
    true,
    1,
    false,
    1
  ),
  (
    'c5bdf4e7-fa87-5808-a9ce-350eb0563ce6'::uuid,
    '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid,
    '[8] Sifão limpo e não está em contato com utensílios',
    true,
    7,
    false,
    1
  )
on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;

update public.checklist_template_items set description = '[1] Organizado e limpo', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 0 where id = '1ad59eab-fe28-5cd2-9460-dc45cffd9204'::uuid;
update public.checklist_template_items set description = '[2] Sem objetos em desuso', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 1 where id = 'f51bd06e-af01-5a78-b497-62888dd9a62c'::uuid;
update public.checklist_template_items set description = '[3] Luminárias protegidas ou de led', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 2 where id = '13fd4b98-6937-5e7c-a8ea-fc2638b5b763'::uuid;
update public.checklist_template_items set description = '[4] Piso e ralo limpos e em bom estado de conservação', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 3 where id = '70b3e70d-c77b-543d-9fb5-811058b3d810'::uuid;
update public.checklist_template_items set description = '[5] Paredes e portas limpas e em bom estado de conservação', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 4 where id = 'e38f9341-b029-5d21-a141-7b702f295c11'::uuid;
update public.checklist_template_items set description = '[6] Janelas e tela milimétricas limpas e em bom estado de conservação', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 5 where id = '9f174375-8cf7-5bc4-96c3-50606024faef'::uuid;
update public.checklist_template_items set description = '[7] Prateleiras, armários (gabinetes), gavetas, limpos e em bom estado de conservação', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 6 where id = 'c0408a93-2a75-573f-9b75-b2b60d5d11eb'::uuid;
update public.checklist_template_items set description = '[8] Sifão limpo e não está em contato com utensílios', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 7 where id = 'c5bdf4e7-fa87-5808-a9ce-350eb0563ce6'::uuid;
update public.checklist_template_items set description = '[9] Lixeiras limpas, com tampa e acionamento no pedal', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 8 where id = '4df7ca69-71bc-5cea-b9e3-4e3ad4c41908'::uuid;
update public.checklist_template_items set description = '[10] Pia exclusiva de higienização de mãos ', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 9 where id = '560aa090-f50c-5b4c-b0b9-487ad0ffbd62'::uuid;
update public.checklist_template_items set description = '[11] Planilha de higiene devidamente preenchida', section_id = '61466ba3-0446-5055-9dd0-68a94ba71591'::uuid, position = 10 where id = 'c0087977-f374-5e89-94da-6bdda627a15a'::uuid;
update public.checklist_template_items set description = '[12] Pias e bancadas organizadas e limpas', section_id = 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, position = 0 where id = 'c257b569-fae9-5d0b-a2fa-d37a392c6b26'::uuid;
update public.checklist_template_items set description = '[13] Geladeiras e freezers organizados e limpos ', section_id = 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, position = 1 where id = 'b1c48df8-fbf2-5ead-852e-241cfa48611b'::uuid;
update public.checklist_template_items set description = '[14] Fogão e forno limpos e em bom estado de conservação', section_id = 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, position = 2 where id = 'ab19989d-a31a-5d2c-af32-2c3d01790ceb'::uuid;
update public.checklist_template_items set description = '[15] Forno de micro-ondas limpo e em bom estado de conservação', section_id = 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, position = 3 where id = '1fe60047-8d40-5046-8287-e5d63f7ec9ec'::uuid;
update public.checklist_template_items set description = '[16] Coifa ou Sistema de exaustão limpo e em bom estado de conservação', section_id = 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, position = 4 where id = 'c2373520-39af-57fd-ab7d-143f0b0ae25d'::uuid;
update public.checklist_template_items set description = '[17] Liquidificador, batedeira, mixer limpos e em bom estado de conservação', section_id = 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, position = 5 where id = '46e3cbb6-afa5-5e3c-b714-6186b34f649b'::uuid;
update public.checklist_template_items set description = '[18] Planilha de temperatura de equipamentos devidamente preenchida', section_id = 'af57fd73-e307-59ec-9706-62c192abff61'::uuid, position = 6 where id = '5259301b-5ca7-5ee3-ab0f-b8343cd11c8e'::uuid;
update public.checklist_template_items set description = '[19] Organizados e limpos', section_id = '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, position = 0 where id = 'b49e18cc-e1cf-51ff-9e92-2de659527071'::uuid;
update public.checklist_template_items set description = '[20] Utensílios de material lavável e mantidos em bom estado de conservação', section_id = '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, position = 1 where id = '8ff636a1-4b3f-5b24-a32f-ac3b3868a68d'::uuid;
update public.checklist_template_items set description = '[21] Utilização de álcool 70% após lavagem', section_id = '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, position = 2 where id = 'fecb04fe-c4dc-54b2-8f59-05c2fd78c256'::uuid;
update public.checklist_template_items set description = '[22] Utensílios plásticos sanitizados e em bom estado de conservação', section_id = '7660cd6b-45bc-5308-a17a-6ce33817c8cc'::uuid, position = 3 where id = 'b36d6cff-65c4-558a-9076-eae4b817148b'::uuid;
update public.checklist_template_items set description = '[23] Uniformes adequados e limpos', section_id = 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, position = 0 where id = 'd58f5d88-7290-5c84-ac24-b0c2539cb283'::uuid;
update public.checklist_template_items set description = '[24] Utilização de touca', section_id = 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, position = 1 where id = 'a67aeba0-2be7-5d49-b8d3-0bbb0c5aa7db'::uuid;
update public.checklist_template_items set description = '[25] Ausência de adornos (aliança, anéis, brincos, entre outros.) e barba aparada', section_id = 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, position = 2 where id = '9b8c80a9-2177-58cd-aa98-a8bdf182b7e5'::uuid;
update public.checklist_template_items set description = '[26] Mãos limpas, unhas curtas, sem esmalte', section_id = 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, position = 3 where id = 'cdff46f2-a94d-5dc0-b514-633a891cbfa8'::uuid;
update public.checklist_template_items set description = '[27] Lavagem de mãos adequada', section_id = 'd21c55f5-e90f-5c72-a6a3-28500eec951d'::uuid, position = 4 where id = '578f977a-51f8-5544-b45f-e5d5739e6962'::uuid;
update public.checklist_template_items set description = '[28] Recebimento adequado de mercadorias', section_id = 'a520a42e-73c9-58fc-b77e-9b0a20464ee3'::uuid, position = 0 where id = 'bd5ab6eb-df28-5c83-8927-d534b70f5084'::uuid;
update public.checklist_template_items set description = '[29] Planilha de recebimento devidamente preenchida', section_id = 'a520a42e-73c9-58fc-b77e-9b0a20464ee3'::uuid, position = 1 where id = 'f71a3d27-26ee-59d8-8fbe-d24bb3f87983'::uuid;
update public.checklist_template_items set description = '[30] Produtos organizados e setorizados', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 0 where id = '3e69574c-6a17-5041-bad2-4c9dabcbde5c'::uuid;
update public.checklist_template_items set description = '[31] Sistema PVPS ', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 1 where id = '4dbe7192-de66-5028-992d-9cbd58e98e01'::uuid;
update public.checklist_template_items set description = '[32] Armazenamento adequado à temperatura e tipo de alimento', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 2 where id = '632d6540-ce55-5311-9666-a769e9ab0679'::uuid;
update public.checklist_template_items set description = '[33] Identificados corretamente', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 3 where id = '59cce2e8-b177-5db9-b0bb-d8edf0209341'::uuid;
update public.checklist_template_items set description = '[34] Produtos com prazo de validade adequado', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 4 where id = '2308e916-b1c5-54e3-8f23-99428bf146c4'::uuid;
update public.checklist_template_items set description = '[35] Produtos mantidos em prateleiras ou sobre os paletes ou estrados', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 5 where id = '4c6a4edf-603c-5b20-9890-96ccbffb1778'::uuid;
update public.checklist_template_items set description = '[36] Produtos mantidos em embalagens íntegras ', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 6 where id = '1269861d-b80b-5efc-81cf-14554bd64a55'::uuid;
update public.checklist_template_items set description = '[37] Produtos de limpeza armazenados em local exclusivo', section_id = '28475744-ac8e-5035-a4f7-2c9cae99104a'::uuid, position = 7 where id = '1eb15844-e369-5ab2-b466-3b9225e277dd'::uuid;
update public.checklist_template_items set description = '[38] Cardápio exposto e sendo cumprido', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 0 where id = '586e9ea3-34d8-5386-8332-d42bfd377ce8'::uuid;
update public.checklist_template_items set description = '[39] Porcionamento adequado', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 1 where id = 'da5a0fb2-8048-5139-baba-cb4a2b3bfe81'::uuid;
update public.checklist_template_items set description = '[40] Higienização de hortifrutis', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 2 where id = '5525dce1-f3e2-5b23-b5f8-8056db462c62'::uuid;
update public.checklist_template_items set description = '[41] Processo de descongelamento e/ou dessalgue', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 3 where id = '7af72412-ffa1-5442-b357-3f0659849771'::uuid;
update public.checklist_template_items set description = '[42] Manipulação atende às boas práticas e previne contaminação cruzada', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 4 where id = '26a78bc5-9bfc-5603-a5fe-25c2594dbd75'::uuid;
update public.checklist_template_items set description = '[43] Local adequado para manipulação de mamadeiras ou dieta enteral', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 5 where id = '172c45e9-b335-5c6b-927f-cb3cd338ac25'::uuid;
update public.checklist_template_items set description = '[44] Planilha de controle de temperatura dos alimentos', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 6 where id = 'c1f58345-4b04-57ea-a9ff-ece18af09fd6'::uuid;
update public.checklist_template_items set description = '[45] Amostras dos alimentos', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 7 where id = '33e9be7f-e5dc-5e13-b6a3-4d9a224b07be'::uuid;
update public.checklist_template_items set description = '[46] Utilização de panos descartáveis', section_id = '8dc69cac-9878-55b3-8b64-591d01b2de02'::uuid, position = 8 where id = 'b1ec7631-e670-5eb1-a2fd-8098688d3d63'::uuid;
update public.checklist_template_items set description = '[47] Manual de Boas Práticas de Manipulação e POP', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 0 where id = '950f280e-7f58-530c-a1c8-5270ccb855a9'::uuid;
update public.checklist_template_items set description = '[48] Atestado de Saúde Ocupacional vigente', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 1 where id = 'e7e61e9a-e4d7-585b-96dc-71e80b8bfe95'::uuid;
update public.checklist_template_items set description = '[49] PCMSO, PGR e LTCAT ', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 2 where id = '056c77a3-271f-5a48-a339-09bece12bb75'::uuid;
update public.checklist_template_items set description = '[50] Certificado de Controle Integrado de Pragas', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 3 where id = 'd00725d2-ac41-5b35-95af-aadb26eb4ef8'::uuid;
update public.checklist_template_items set description = '[51] Certificado de Higiene de Caixa D''agua', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 4 where id = '93722e9d-5fc8-56f8-b43a-bcb9da4b8396'::uuid;
update public.checklist_template_items set description = '[52] Validade dos Filtros', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 5 where id = '10ad27ad-e9e9-550c-a71a-df7c8b874e75'::uuid;
update public.checklist_template_items set description = '[53] Análise da água', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 6 where id = '1e0fe27f-d4d4-5341-a5c8-00998ad90703'::uuid;
update public.checklist_template_items set description = '[54] AVCB', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 7 where id = '928e5c08-4665-58c6-a857-354ee380f856'::uuid;
update public.checklist_template_items set description = '[55] Extintores', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 8 where id = '8c6fc384-3628-5f09-b9ca-af91abdc3404'::uuid;
update public.checklist_template_items set description = '[56] Calibração de termômetro', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 9 where id = 'f5cbd9b3-3204-50c8-bc9b-2458cc2bae97'::uuid;
update public.checklist_template_items set description = '[57] Licença de funcionamento', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 10 where id = '59ccac5f-6744-5a8f-b1a2-eabb2a799e11'::uuid;
update public.checklist_template_items set description = '[58] Licença sanitária', section_id = '0a57b59a-c9ae-545c-8a1c-801ce8fe9ed6'::uuid, position = 11 where id = '50a432ba-af7e-508b-bed5-1861b9fcf714'::uuid;
