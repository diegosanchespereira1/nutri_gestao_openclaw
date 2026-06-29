-- Checklist padrão Escola/ILPI: restaura prefixos [1]–[8] e ordem correta (position 0–7).
-- Template: bd618d62-2643-53a0-a096-0678f07a2697 — seção Ambiente.

update public.checklist_template_items
set description = '[1] Organizado e limpo', position = 0
where id = '1ad59eab-fe28-5cd2-9460-dc45cffd9204'::uuid;

update public.checklist_template_items
set description = '[2] Sem objetos em desuso', position = 1
where id = 'f51bd06e-af01-5a78-b497-62888dd9a62c'::uuid;

update public.checklist_template_items
set description = '[3] Luminárias protegidas ou de led', position = 2
where id = '13fd4b98-6937-5e7c-a8ea-fc2638b5b763'::uuid;

update public.checklist_template_items
set description = '[4] Piso e ralo limpos e em bom estado de conservação', position = 3
where id = '70b3e70d-c77b-543d-9fb5-811058b3d810'::uuid;

update public.checklist_template_items
set description = '[5] Paredes e portas limpas e em bom estado de conservação', position = 4
where id = 'e38f9341-b029-5d21-a141-7b702f295c11'::uuid;

update public.checklist_template_items
set description = '[6] Janelas e tela milimétricas limpas e em bom estado de conservação', position = 5
where id = '9f174375-8cf7-5bc4-96c3-50606024faef'::uuid;

update public.checklist_template_items
set description = '[7] Prateleiras, armários (gabinetes), gavetas, limpos e em bom estado de conservação', position = 6
where id = 'c0408a93-2a75-573f-9b75-b2b60d5d11eb'::uuid;

update public.checklist_template_items
set description = '[8] Sifão limpo e não está em contato com utensílios', position = 7
where id = 'c5bdf4e7-fa87-5808-a9ce-350eb0563ce6'::uuid;
