-- Subseções numeradas no RDC-275 + coluna is_structure_only em modelos de checklist.
alter table public.checklist_template_items
  add column if not exists is_structure_only boolean not null default false;

alter table public.checklist_custom_items
  add column if not exists is_structure_only boolean not null default false;

do $$
begin
  if exists (
    select 1
      from information_schema.tables
     where table_schema = 'public'
       and table_name = 'checklist_workspace_items'
  ) then
    alter table public.checklist_workspace_items
      add column if not exists is_structure_only boolean not null default false;
  end if;
end $$;

-- Bases que ainda não aplicaram 20260618120000_checklist_scoring.sql (peso).
alter table public.checklist_template_items
  add column if not exists peso numeric(5, 2) not null default 1;

comment on column public.checklist_template_items.is_structure_only is
  'Agrupador de subseção (sem Sim/Não/NA nem pontuação).';

create or replace function public.calculate_and_store_session_score(p_session_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_earned   numeric(10, 2);
  v_total    numeric(10, 2);
  v_pct      numeric(5, 2);
  v_origin   text;
begin
  select case
           when custom_template_id is not null then 'custom'
           when workspace_template_id is not null then 'workspace'
           else 'global'
         end
    into v_origin
    from public.checklist_fill_sessions
   where id = p_session_id;

  if not found then
    return;
  end if;

  if v_origin = 'custom' then
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_custom_items i on i.id = r.custom_item_id
     where r.session_id = p_session_id
       and r.custom_item_id is not null
       and coalesce(i.is_structure_only, false) = false;
  elsif v_origin = 'workspace' then
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_workspace_items i on i.id = r.workspace_item_id
     where r.session_id = p_session_id
       and r.workspace_item_id is not null
       and coalesce(i.is_structure_only, false) = false;
  else
    select
      coalesce(sum(case when r.outcome = 'conforme' then i.peso else 0 end), 0),
      coalesce(sum(case when r.outcome != 'na'      then i.peso else 0 end), 0)
      into v_earned, v_total
      from public.checklist_fill_item_responses r
      join public.checklist_template_items i on i.id = r.template_item_id
     where r.session_id = p_session_id
       and r.template_item_id is not null
       and coalesce(i.is_structure_only, false) = false;
  end if;

  if v_total > 0 then
    v_pct := round((v_earned / v_total) * 100, 2);
  else
    v_pct := null;
  end if;

  update public.checklist_fill_sessions
     set score_percentage    = v_pct,
         score_points_earned = v_earned,
         score_points_total  = v_total
   where id = p_session_id;
end;
$$;


delete from public.checklist_template_items
 where section_id in (
   select id from public.checklist_template_sections
    where template_id = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d00'::uuid
 );


insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('8ae75267-f42b-562c-9c36-f548bc3a8be9'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.1 — ÁREA EXTERNA', false, 0, true, 1),
  ('840a99df-21b1-5a6c-89bb-7aaa64180f89'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.1.1] Área externa livre de focos de insalubridade, de objetos em desuso ou estranhos ao ambiente, de vetores e outros animais no pátio e vizinhança; de focos de poeira; de acúmulo de lixo nas imediações, de água estagnada, dentre outros.', true, 1, false, 1),
  ('35b720f3-40ab-5aba-9312-ac0168c9cd57'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.1.2] Vias de acesso interno com superfície dura ou pavimentada, adequada ao trânsito sobre rodas, escoamento adequado e limpas', true, 2, false, 1),
  ('65735cb7-41ce-5e1e-bc1a-123d6125cb7d'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.2 — ACESSO', false, 3, true, 1),
  ('11eccfb7-1902-5d3b-aa5c-5fc11d579f07'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.2.1] Direto, não comum a outros usos ( habitação).', true, 4, false, 1),
  ('36a1c1e2-18b7-5d1d-a7ac-08215807eb7e'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.3 — ÁREA INTERNA', false, 5, true, 1),
  ('ea276c03-dd27-5379-bc9d-b2e85af1ff09'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.3.1] Área interna livre de objetos em desuso ou estranhos ao ambiente.', true, 6, false, 1),
  ('fa2122a1-4c61-5861-824b-c706a55de740'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.4 — PISO', false, 7, true, 1),
  ('ca657f07-a524-5e3b-b616-0050d1b26e45'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.4.1] Material que permite fácil e apropriada higienização (liso, resistente, drenados com declive, impermeável e outros).', true, 8, false, 1),
  ('841b762a-8dc5-5d07-819c-9be29751ac21'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.4.2] Em adequado estado de conservação (livre de defeitos, rachaduras, trincas, buracos e outros).', true, 9, false, 1),
  ('c8351c38-badb-5c3f-bdc8-2c5753aa5746'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.4.3] Sistema de drenagem dimensionado adequadamente, sem acúmulo de resíduos. Drenos, ralos sifonados e grelhas colocados em locais adequados de forma a facilitar o escoamento e proteger contra a entrada de baratas, roedores etc.', true, 10, false, 1),
  ('33c7e70f-8082-5f99-adf3-e0bca6e9e04f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.5 — TETOS', false, 11, true, 1),
  ('3d317346-e47e-5c5d-bff6-42804fd3b824'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.5.1] Acabamento liso, em cor clara, impermeável, de fácil limpeza e, quando for o caso, desinfecção', true, 12, false, 1),
  ('aaffdba5-0378-5c0a-a77a-ede883c7821a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.5.2] Em adequado estado de conservação (livre de trincas, rachaduras, umidade, bolor, descascamentos e outros)', true, 13, false, 1),
  ('89d22f92-17df-5cd9-9112-cccfc6c08927'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.6 — PAREDES E DIVISÓRIAS', false, 14, true, 1),
  ('612a7942-dda8-57c2-9ec9-e766346595fd'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.6.1] Acabamento liso, impermeável e de fácil higienização até uma altura adequada para todas as operações. De cor clara', true, 15, false, 1),
  ('1497fa63-bff1-523d-b47c-b5f51831b284'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.6.2] Em adequado estado de conservação (livres de falhas, rachaduras, umidade, descascamento e outros)', true, 16, false, 1),
  ('bf83d9d8-07c4-5e06-970c-7561271340b9'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.6.3] Existência de ângulos abaulados entre as paredes e o piso e entre as paredes e o teto', true, 17, false, 1),
  ('a24fde86-1fd2-5efc-9cfa-771569a3a1dc'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.7 — PORTAS', false, 18, true, 1),
  ('e69b83db-b573-502a-8c22-d4d471356387'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.7.1] Com superfície lisa, de fácil higienização, ajustadas aos batentes, sem falhas de revestimento', true, 19, false, 1),
  ('6702d00b-3331-5d5c-8a41-17b0a212aa7f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.7.2] Portas externas com fechamento automático (mola, sistema eletrônico ou outro) e com barreiras adequadas para impedir entrada de vetores e outros animais (telas milimétricas ou outro sistema)', true, 20, false, 1),
  ('2c855fd1-b601-509a-a9e3-0878f4ca6a4c'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.7.3] Em adequado estado de conservação (livres de falhas, rachaduras, umidade, descascamento e outros)', true, 21, false, 1),
  ('9062b9d3-5d81-5825-a699-f991ffab0c09'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.8 — JANELAS E OUTRAS ABERTURAS', false, 22, true, 1),
  ('b5083567-e7f2-53fb-b10f-7f0f763bf8a6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.8.1] Com superfície lisa, de fácil higienização, ajustadas aos batentes, sem falhas de revestimento', true, 23, false, 1),
  ('4763c043-9a1d-5d55-b847-d3ab07ec7767'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.8.2] Existência de proteção contra insetos e roedores (telas milimétricas ou outro sistema)', true, 24, false, 1),
  ('cb9061e3-0c78-5a88-8693-b9c7267a6a95'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.8.3] Em adequado estado de conservação (livres de falhas, rachaduras, umidade, descascamento e outros).', true, 25, false, 1),
  ('a783bbc2-2264-53fb-9a59-32d9d193716f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.9 — ESCADAS, ELEVADORES DE SERVIÇO, MONTACARGAS E ESTRUTURAS AUXILIARES', false, 26, true, 1),
  ('fef567f1-02de-5618-9513-02f3f3ea8eee'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.9.1] Construídos, localizados e utilizados de forma a não serem fontes de contaminação', true, 27, false, 1),
  ('2dee273f-e674-56f2-9c2d-9528526a717a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.9.2] De material apropriado, resistente, liso e impermeável, em adequado estado de conservação', true, 28, false, 1),
  ('9cd53468-37a6-5db9-ac4e-8be4604b6837'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.10 — INSTALAÇÕES SANITÁRIAS E VESTIÁRIOS PARA OS MANIPULADORES', false, 29, true, 1),
  ('2db87387-7d9b-5ee2-9b05-59a77a615e9f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.1] Quando localizados isolados da área de produção, acesso realizado por passagens cobertas e calçadas', true, 30, false, 1),
  ('d14a1332-7790-51fb-998c-a46f24806403'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.2] Independentes para cada sexo (conforme legislação específica), identificados e de uso exclusivo para manipuladores de alimentos', true, 31, false, 1),
  ('5a5a1451-4d9a-5f00-b1a8-1849ab1db462'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.3] Instalações sanitárias com vasos sanitários; mictórios e lavatórios íntegros e em proporção adequada ao número de empregados (conforme legislação específica)', true, 32, false, 1),
  ('2bad3fa2-d6b3-59e9-8981-9a9b2616991a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.4] Instalações sanitárias servidas de água corrente, dotadas preferencialmente de torneira com acionamento automático e conectadas à rede de esgoto ou fossa séptica', true, 33, false, 1),
  ('ce6d9730-e6ec-5bbd-bb3c-c26361e5684b'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.5] Ausência de comunicação direta (incluindo sistema de exaustão) com a área de trabalho e de refeições', true, 34, false, 1),
  ('1e427adc-d43e-5872-8075-c91a8fc68544'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.6] Portas com fechamento automático (mola, sistema eletrônico ou outro)', true, 35, false, 1),
  ('93201f18-82e9-5aa4-a536-5226e0b35e28'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.7] Pisos e paredes adequadas e apresentando satisfatório estado de conservação', true, 36, false, 1),
  ('99284a0f-be21-56a5-95a1-b03c9a597adb'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.8] Iluminação e ventilação adequadas', true, 37, false, 1),
  ('90e8bb03-b775-5e54-a1ca-ea7f449932c7'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.9] Instalações sanitárias dotadas de produtos destinados à higiene pessoal: papel higiênico, sabonete líquido inodoro anti-séptico ou sabonete líquido inodoro e anti-séptico, toalhas de papel não reciclado para as mãos ou outro sistema higiênico e seguro para secagem', true, 38, false, 1),
  ('f84250bb-52f5-54e5-94f7-0ffda9b8fcc6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.10] Presença de lixeiras com tampas e com acionamento não manual', true, 39, false, 1),
  ('b8cf7631-edd9-5444-920e-69973962ea38'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.11] Coleta freqüente do lixo', true, 40, false, 1),
  ('ebc1c2df-6727-5544-9b3c-e27942db2aa2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.12] Presença de avisos com os procedimentos para lavagem das mãos', true, 41, false, 1),
  ('6ca51f9d-17ab-5888-a3df-7a0f2411cc9a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.13] Vestiários com área compatível e armários individuais para todos os manipuladores', true, 42, false, 1),
  ('5e629347-450f-5ac8-b2af-04fe98d36685'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.14] Duchas ou chuveiros em número suficiente (conforme legislação específica), com água fria ou com água quente e fria', true, 43, false, 1),
  ('17609b1a-08b8-5a9d-8036-2427d6757811'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.10.15] Apresentam-se organizados e em adequado estado de conservação.', true, 44, false, 1)
on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;
insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('35270dd9-46b0-5639-be5a-d6bc2680f949'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.11 — INSTALAÇÕES SANITÁRIAS PARA VISITANTES E OUTROS', false, 45, true, 1),
  ('c84afe9a-9ea8-532e-a223-5c09e9ddb680'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.11.1] Instaladas totalmente independentes da área de produção e higienizados', true, 46, false, 1),
  ('f37147ba-9d2e-54db-9f86-47b948e101ff'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.12 — LAVATÓRIOS NA ÁREA DE PRODUÇÃO', false, 47, true, 1),
  ('2741cbf1-bf28-5763-8c48-8460450961d2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.12.1] Existência de lavatórios na área de manipulação com água corrente, dotados preferencialmente de torneira com acionamento automático, em posições adequadas em relação ao fluxo de produção e serviço, e em número suficiente de modo a atender toda a área de produção', true, 48, false, 1),
  ('57cad7f9-bbb1-58d9-a942-05815bc62ceb'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.12.2] Lavatórios em condições de higiene, dotados de sabonete líquido inodoro anti-séptico ou sabonete líquido inodoro e anti-séptico, toalhas de papel não reciclado ou outro sistema higiênico e seguro de secagem e coletor de papel acionados sem contato manual', true, 49, false, 1),
  ('24ff57a5-8d92-500c-82e3-fb65b4d7c42f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.13 — ILUMINAÇÃO E INSTALAÇÃO ELÉTRICA', false, 50, true, 1),
  ('3d270960-46f1-5d76-a26e-4ed2874c95e2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.13.1] Natural ou artificial adequada à atividade desenvolvida, sem ofuscamento, reflexos fortes, sombras e contrastes excessivos', true, 51, false, 1),
  ('555d3398-7f37-58ea-9802-5006ab75fee8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.13.2] Luminárias com proteção adequada contra quebras e em adequado estado de conservação', true, 52, false, 1),
  ('9b932446-ece1-5c24-8ba0-96f67f11d052'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.13.3] Instalações elétricas embutidas ou quando exteriores revestidas por tubulações isolantes e presas a paredes e tetos', true, 53, false, 1),
  ('6393f45c-bb0d-5b83-ac8a-fd93316708ac'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.14 — VENTILAÇÃO E CLIMATIZAÇÃO', false, 54, true, 1),
  ('39cd9195-fc74-589a-93de-daac3b036ab7'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.14.1] Ventilação e circulação de ar capazes de garantir o conforto térmico e o ambiente livre de fungos, gases, fumaça, pós, partículas em suspensão e condensação de vapores sem causar danos à produção', true, 55, false, 1),
  ('e09b65a9-946e-5685-a113-1c98b390b671'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.14.2] Ventilação artificial por meio de equipamento(s) higienizado(s) e com manutenção adequada ao tipo de equipamento', true, 56, false, 1),
  ('23064848-3beb-5cef-9c90-5936f410b634'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.14.3] Ambientes climatizados artificialmente com filtros adequados', true, 57, false, 1),
  ('94ce50a0-8cea-5263-b34c-f8800778a7fd'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.14.4] Existência de registro periódico dos procedimentos de limpeza e manutenção dos componentes do sistema de climatização (conforme legislação específica) afixado em local visível', true, 58, false, 1),
  ('e15dd266-dfc3-535d-af18-75ba8dd84114'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.14.5] Sistema de exaustão e ou insuflamento com troca de ar capaz de prevenir contaminações', true, 59, false, 1),
  ('7244a4d9-f765-53b3-8016-c2ccd659dffb'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.14.6] Sistema de exaustão e ou insuflamento dotados de filtros adequados.', true, 60, false, 1),
  ('64090a5f-d88f-50fc-a360-1de7e6175b94'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.14.7] Captação e direção da corrente de ar não seguem a direção da área contaminada para área limpa', true, 61, false, 1),
  ('d3415859-27b4-53e7-8e89-846ea28ede67'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.15 — HIGIENIZAÇÃO DAS INSTALAÇÕES', false, 62, true, 1),
  ('d17dd70a-d6eb-56e1-bd9b-99c7df006545'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.1] Existência de um responsável pela operação de higienização comprovadamente capacitado', true, 63, false, 1),
  ('e87ffd80-1b31-5bcf-872e-9be0187f49ef'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.2] Freqüência de higienização das instalações adequada', true, 64, false, 1),
  ('1094094a-f228-5499-b16f-85ceb0a817b7'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.3] Existência de registro da higienização', true, 65, false, 1),
  ('216b97e8-6701-5337-963b-1644d855c1f8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.4] Produtos de higienização regularizados pelo Ministério da Saúde', true, 66, false, 1),
  ('9e764c44-a204-5f15-b22f-4b801bd03e79'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.5] Disponibilidade dos produtos de higienização necessários à realização da operação', true, 67, false, 1),
  ('2684c176-a780-50ce-b140-1fdab0c9b782'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.6] A diluição dos produtos de higienização, tempo de contato e modo de uso/aplicação obedecem às instruções recomendadas pelo fabricante', true, 68, false, 1),
  ('55d466fe-2586-53af-a789-465b953f967b'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.7] Produtos de higienização identificados e guardados em local adequado', true, 69, false, 1),
  ('b4b0d84a-4b7a-52fb-9d86-26f11ef879c5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.8] Disponibilidade e adequação dos utensílios (escovas, esponjas etc.) necessários à realização da operação. Em bom estado de conservação', true, 70, false, 1),
  ('f0d11c5d-5b8f-5fac-b290-6a5ccc10769f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.15.9] Higienização adequada', true, 71, false, 1),
  ('e036dfcd-78a0-58c8-ae2a-d19de107d6d2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.16 — CONTROLE INTEGRADO DE VETORES E PRAGAS URBANAS', false, 72, true, 1),
  ('0905281a-689b-55e3-8c57-07bafe319d93'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.16.1] Ausência de vetores e pragas urbanas ou qualquer evidência de sua presença como fezes, ninhos e outros', true, 73, false, 1),
  ('6ed494ba-dd96-5f83-bf8f-4f44b1a60b3a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.16.2] Adoção de medidas preventivas e corretivas com o objetivo de impedir a atração, o abrigo, o acesso e ou proliferação de vetores e pragas urbanas', true, 74, false, 1),
  ('81a48884-2bc5-5daf-bab4-ae936bfd32d8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.16.3] Em caso de adoção de controle químico, existência de comprovante de execução do serviço expedido por empresa especializada', true, 75, false, 1),
  ('bd6a8d73-7174-5c7f-b9ec-2b23814b4bd6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.17 — ABASTECIMENTO DE ÁGUA', false, 76, true, 1),
  ('d0b3bde4-7d79-5622-a677-2d0f0d5ebf30'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.1] Sistema de abastecimento ligado à rede pública', true, 77, false, 1),
  ('e73ba24d-88dd-5adb-9cf7-7a7fff7a4cc1'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.2] Sistema de captação própria, protegido, revestido e distante de fonte de contaminação', true, 78, false, 1),
  ('fb3d6b47-8e74-54ee-96c5-9097ac4ae802'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.3] Reservatório de água acessível com instalação hidráulica com volume, pressão e temperatura adequados, dotado de tampas, em satisfatória condição de uso, livre de vazamentos, infiltrações e descascamentos', true, 79, false, 1),
  ('18889e70-2fdf-5cd1-8d56-081bc84d3c73'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.4] Existência de responsável comprovadamente capacitado para a higienização do reservatório da água', true, 80, false, 1),
  ('e6903aba-0b03-57d8-ac54-012723fc97f8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.5] Apropriada freqüência de higienização do reservatório de água', true, 81, false, 1),
  ('fd2f60ff-9506-5c91-9591-52cb6b3d52a7'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.6] Existência de registro da higienização do reservatório de água ou comprovante de execução de serviço em caso de terceirização.', true, 82, false, 1),
  ('ab7c8094-2d48-51df-8608-a4e8703691cd'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.7] Encanamento em estado satisfatório e ausência de infiltrações e interconexões, evitando conexão cruzada entre água potável e não potável', true, 83, false, 1),
  ('75c9b72d-598e-5738-8346-52f3e559d89a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.8] Existência de planilha de registro da troca periódica do elemento filtrante', true, 84, false, 1),
  ('d60bd6e6-48b5-5d1a-8469-78fa35fdfef5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.9] Potabilidade da água atestada por meio de laudos laboratoriais, com adequada periodicidade, assinados por técnico responsável pela análise ou expedidos por empresa terceirizada', true, 85, false, 1),
  ('26d0d54e-bee0-536a-a443-216fea341e01'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.10] Disponibilidade de reagentes e equipamentos necessários à análise da potabilidade de água realizadas no estabelecimento', true, 86, false, 1),
  ('8247b4da-289c-56b9-ab23-94a46edcef5c'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.11] Controle de potabilidade realizado por técnico comprovadamente capacitado', true, 87, false, 1),
  ('ddcdb001-6221-5894-bb5f-546c1e9a9ccb'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.12] Gelo produzido com água potável, fabricado, manipulado e estocado sob condições sanitárias satisfatórias, quando destinado a entrar em contato com alimento ou superfície que entre em contato com alimento', true, 88, false, 1),
  ('12edc3d4-2bff-57fa-82cc-53fbf68e9cab'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.17.13] Vapor gerado a partir de água potável quando utilizado em contato com o alimento ou superfície que entre em contato com o alimento', true, 89, false, 1)
on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;
insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('514790a2-f19f-5b6c-bd71-5523986dcf82'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.18 — MANEJO DOS RESÍDUOS', false, 90, true, 1),
  ('9dea3bee-b185-5ba4-bc68-b9fcc75b9687'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.18.1] Recipientes para coleta de resíduos no interior do estabelecimento de fácil higienização e transporte, devidamente identificados e higienizados constantemente; uso de sacos de lixo apropriados. Quando necessário, recipientes tampados com acionamento não manual', true, 91, false, 1),
  ('95b93cf6-ba0b-52f9-accc-459dbbb0f93f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.18.2] Retirada freqüente dos resíduos da área de processamento, evitando focos de contaminação', true, 92, false, 1),
  ('a3c37279-b1a5-50f7-80c6-b48cd77315ac'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.18.3] Existência de área adequada para estocagem dos resíduos', true, 93, false, 1),
  ('a3164e4d-1334-5fc4-9053-85736e9bb59b'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.19 — ESGOTAMENTO SANITÁRIO', false, 94, true, 1),
  ('c53b8343-fe1f-5615-9b5e-aae006475c6f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.19.1] Fossas, esgoto conectado à rede pública, caixas de gordura em adequado estado de conservação e funcionamento', true, 95, false, 1),
  ('6b68658e-d6d8-5141-8da7-3114cf974ba6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '1.20 — LEIAUTE', false, 96, true, 1),
  ('d36a808e-d6cc-5a5e-a894-f287e8894356'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.20.1] Leiaute adequado ao processo produtivo: número, capacidade e distribuição das dependências de acordo com o ramo de atividade, volume de produção e expedição', true, 97, false, 1),
  ('8d9be282-22d5-5279-9ed5-ab08e5a54f19'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d01'::uuid, '[1.20.2] Áreas para recepção e depósito de matéria-prima, ingredientes e embalagens distintas das áreas de produção, armazenamento e expedição de produto final.', true, 98, false, 1),
  ('ea6fdb6b-ba0c-5ba0-af9b-4df415d8df93'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '2.1 — EQUIPAMENTOS', false, 0, true, 1),
  ('5b9f49ad-8da2-5ac7-bdce-92952517bce4'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.1] Equipamentos da linha de produção com desenho e número adequado ao ramo', true, 1, false, 1),
  ('aa05bd7b-abce-58a7-85a0-9a1a435b0be6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.2] Dispostos de forma a permitir fácil acesso e higienização adequada', true, 2, false, 1),
  ('dd243b7a-4480-5906-8a50-9aa51cffb97f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.3] Superfícies em contato com alimentos lisas, íntegras, impermeáveis, resistentes à corrosão, de fácil higienização e de material não contaminante', true, 3, false, 1),
  ('d3487e60-3af4-512f-b241-b29d836c58c4'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.4] Em adequado estado de conservação e funcionamento', true, 4, false, 1),
  ('3bdad0a1-7146-5a42-8259-00b2813301a6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.5] Equipamentos de conservação dos alimentos (refrigeradores, congeladores, câmaras frigoríficas e outros), bem como os destinados ao processamento térmico, com medidor de temperatura localizado em local apropriado e em adequado funcionamento', true, 5, false, 1),
  ('12ba8b96-f9f1-5a6c-b273-b131a563fcf6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.6] Existência de planilhas de registro da temperatura, conservadas durante período adequado', true, 6, false, 1),
  ('d9ad2aba-6aed-51c5-b9c0-1a4c90bb7d0d'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.7] Existência de registros que comprovem que os equipamentos e maquinários passam por manutenção preventiva', true, 7, false, 1),
  ('fc1de4ea-2c71-579d-965b-c7cb43f15886'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.1.8] Existência de registros que comprovem a calibração dos instrumentos e equipamentos de medição ou comprovante da execução do serviço quando a calibração for realizada por empresas terceirizadas', true, 8, false, 1),
  ('e59fe04e-35b3-5cf8-90d8-a332352108ef'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '2.2 — MÓVEIS: (mesas, bancadas, vitrines, estantes)', false, 9, true, 1),
  ('f411ed97-9f2b-563b-948e-2dd4e87f5bf5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.2.1] Em número suficiente, de material apropriado, resistentes, impermeáveis; em adequado estado de conservação, com superfícies íntegras', true, 10, false, 1),
  ('8e444de2-bfb9-514e-aa41-51a58eea6c24'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.2.2] Com desenho que permita uma fácil higienização (lisos, sem rugosidades e frestas)', true, 11, false, 1),
  ('3149b2a1-efdb-5547-9d70-a3457aad2175'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '2.3 — UTENSÍLIOS', false, 12, true, 1),
  ('c7cd6624-fb1e-56ed-a6fc-b4c86cb7dff1'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.3.1] Material não contaminante, resistentes à corrosão, de tamanho e forma que permitam fácil higienização: em adequado estado de conservação e em número suficiente e apropriado ao tipo de operação utilizada', true, 13, false, 1),
  ('2a08d930-1484-5f65-9c15-34d0f517ba6f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.3.2] Armazenados em local apropriado, de forma organizada e protegidos contra a contaminação', true, 14, false, 1),
  ('9a84cce8-d786-5899-aa19-a719bf46117f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '2.4 — HIGIENIZAÇÃO DOS EQUIPAMENTOS E MAQUINÁRIOS, E DOS MÓVEIS E UTENSÍLIOS', false, 15, true, 1),
  ('2525a2d7-9f44-5e03-9669-b839545d7bd8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.1] Existência de um responsável pela operação de higienização comprovadamente capacitado', true, 16, false, 1),
  ('a232a009-c877-591b-a7f7-6f380bc68a1e'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.2] Freqüência de higienização adequada', true, 17, false, 1),
  ('97917540-1a73-56d6-8562-cab89dde516c'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.3] Existência de registro da higienização', true, 18, false, 1),
  ('94fe0741-308d-5c9c-9c0d-a365849fb6d0'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.4] Produtos de higienização regularizados pelo Ministério da Saúde', true, 19, false, 1),
  ('b33083f7-0b6e-506e-b1d4-d27a5077e3f8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.5] Disponibilidade dos produtos de higienização necessários à realização da operação', true, 20, false, 1),
  ('0e62ba87-0a30-591d-bdf7-3db821e2994f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.6] Diluição dos produtos de higienização, tempo de contato e modo de uso/aplicação obedecem às instruções recomendadas pelo fabricante', true, 21, false, 1),
  ('3d0e8110-d815-5ec1-b60b-87d776457460'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.7] Produtos de higienização identificados e guardados em local adequado', true, 22, false, 1),
  ('ff80ccf9-dfce-55c2-90bb-273a448bef06'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.8] Disponibilidade e adequação dos utensílios necessários à realização da operação. Em bom estado de conservação', true, 23, false, 1),
  ('ffc1a53b-fe08-5e52-ab15-2551ccf31cd3'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d02'::uuid, '[2.4.9] Adequada higienização', true, 24, false, 1),
  ('21b3e419-e81e-53b3-95ac-329ed6297bd3'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '3.1 — VESTUÁRIO', false, 0, true, 1),
  ('f1a79091-8abe-56b9-9e6e-3f5eeff3c161'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.1.1] Utilização de uniforme de trabalho de cor clara, adequado à atividade e exclusivo para área de produção', true, 1, false, 1),
  ('b09b1649-c832-5d57-9b23-0f3bb923cda7'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.1.2] Limpos e em adequado estado de conservação', true, 2, false, 1),
  ('adae69c4-e372-567b-b658-c6471275ba7e'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.1.3] Asseio pessoal: boa apresentação, asseio corporal, mãos limpas, unhas curtas, sem esmalte, sem adornos (anéis, pulseiras, brincos, etc.); manipuladores barbeados, com os cabelos protegidos', true, 3, false, 1),
  ('d39aef8b-426e-5f01-b29c-10c959fcac42'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '3.2 — HÁBITOS HIGIÊNICOS', false, 4, true, 1),
  ('0fed2d6d-64bd-57d3-8510-396eb714976f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.2.1] Lavagem cuidadosa das mãos antes da manipulação de alimentos, principalmente após qualquer interrupção e depois do uso de sanitários', true, 5, false, 1),
  ('634e1852-8838-54b8-8199-b3724d5a0442'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.2.2] Manipuladores não espirram sobre os alimentos, não cospem, não tossem, não fumam, não manipulam dinheiro ou não praticam outros atos que possam contaminar o alimento', true, 6, false, 1),
  ('1c9eab66-13f9-5999-bd6a-471b8f0af7c3'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.2.3] Cartazes de orientação aos manipuladores sobre a correta lavagem das mãos e demais hábitos de higiene, afixados em locais apropriados', true, 7, false, 1),
  ('a0cfa6e9-b770-5bb0-a946-28575a9c9e6c'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '3.3 — ESTADO DE SAÚDE', false, 8, true, 1),
  ('7b3617e0-68cf-5a06-9472-a7e9ede3cd28'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.3.1] Ausência de afecções cutâneas, feridas e supurações; ausência de sintomas e infecções respiratórias, gastrointestinais e oculares', true, 9, false, 1),
  ('67800551-f4f3-52be-b569-107e46d36bc5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '3.4 — PROGRAMA DE CONTROLE DE SAÚDE', false, 10, true, 1)
on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;
insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('731b5cff-24b3-513a-9032-95d2bef3ce27'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.4.1] Existência de supervisão periódica do estado de saúde dos manipuladores', true, 11, false, 1),
  ('d24fd13e-9b3c-5868-b1a1-20a32662e5ae'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.4.2] Existência de registro dos exames realizados', true, 12, false, 1),
  ('a86aad88-55f9-50b0-952f-12b304a4c86f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '3.5 — EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL', false, 13, true, 1),
  ('d22867df-6c80-5d82-b081-8a8365e33c31'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.5.1] Utilização de Equipamento de Proteção Individual', true, 14, false, 1),
  ('ca493443-6eee-5538-aa32-0e3500d4b63f'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '3.6 — PROGRAMA DE CAPACITAÇÃO DOS MANIPULADORES E SUPERVISÃO', false, 15, true, 1),
  ('14ef5002-0f7c-56d2-b613-dad989c9ddee'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.6.1] Existência de programa de capacitação adequado e contínuo relacionado à higiene pessoal e à manipulação dos alimentos', true, 16, false, 1),
  ('0ec915f4-3d63-5614-be69-f7b176b1aba5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.6.2] Existência de registros dessas capacitações', true, 17, false, 1),
  ('46a42ec5-6a97-5028-b07b-1817085b0c53'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.6.3] Existência de supervisão da higiene pessoal e manipulação dos alimentos', true, 18, false, 1),
  ('6d8584d6-a13c-5608-8beb-b8a51f99269e'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d03'::uuid, '[3.6.4] Existência de supervisor comprovadamente capacitado', true, 19, false, 1),
  ('bb345050-8c6f-5c32-897c-dc9cac371711'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '4.1 — MATÉRIA-PRIMA, INGREDIENTES E EMBALAGENS', false, 0, true, 1),
  ('2fef7c9b-5f12-562f-9ff0-3f1125ff30db'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.1] Operações de recepção da matéria-prima, ingredientes e embalagens são realizadas em local protegido e isolado da área de processamento', true, 1, false, 1),
  ('71436b54-9cb5-5f0a-9fb6-75c5ddd1eba5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.2] Matérias - primas, ingredientes e embalagens inspecionados na recepção', true, 2, false, 1),
  ('52d6eda9-892a-5d75-a112-0256a3c131c5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.3] Existência de planilhas de controle na recepção (temperatura e características sensoriais, condições de transporte e outros)', true, 3, false, 1),
  ('0a23a609-e641-53de-88fd-39c73b0e2834'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.4] Matérias-primas e ingredientes aguardando liberação e aqueles aprovados estão devidamente identificados', true, 4, false, 1),
  ('c3793ae8-9a8b-5ebf-abe0-9e6b7f796655'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.5] Matérias-primas, ingredientes e embalagens reprovados no controle efetuado na recepção são devolvidos imediatamente ou identificados e armazenados em local separado', true, 5, false, 1),
  ('b42e4f81-48fe-5a66-b1dd-ab60978cc014'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.6] Rótulos da matéria-prima e ingredientes atendem à legislação', true, 6, false, 1),
  ('d170c1ca-af20-5608-b9cf-03b228fce51a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.7] Critérios estabelecidos para a seleção das matérias-primas são baseados na segurança do alimento', true, 7, false, 1),
  ('d7cde776-0cd1-5b82-93ad-3e6b062589f0'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.8] Armazenamento em local adequado e organizado; sobre estrados distantes do piso, ou sobre paletes, bem conservados e limpos, ou sobre outro sistema aprovado, afastados das paredes e distantes do teto de forma que permita apropriada higienização, iluminação e circulação de ar', true, 8, false, 1),
  ('386935be-8299-5e0a-b6b7-9e556a429e12'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.9] Uso das matérias-primas, ingredientes e embalagens respeita a ordem de entrada dos mesmos, sendo observado o prazo de validade.', true, 9, false, 1),
  ('2dac5b89-ef7c-5549-9c0f-8b29661fa176'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.10] Acondicionamento adequado das embalagens a serem utilizadas', true, 10, false, 1),
  ('2f60d1a5-8924-5198-ad87-dc9adf4cbac0'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.1.11] Rede de frio adequada ao volume e aos diferentes tipos de matérias-primas e ingredientes', true, 11, false, 1),
  ('3e74f2a1-817f-5f3c-9691-ca3e564584e5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '4.2 — FLUXO DE PRODUÇÃO', false, 12, true, 1),
  ('6111fa0e-6520-53d2-9509-d4aae3d5a197'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.2.1] Locais para pré - preparo ("área suja") isolados da área de preparo por barreira física ou técnica', true, 13, false, 1),
  ('150f15ed-4348-5d31-9127-e8c167e1dbde'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.2.2] Controle da circulação e acesso do pessoal', true, 14, false, 1),
  ('25d6c91d-7e4d-5873-90fe-98ed8263a2f3'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.2.3] Conservação adequada de materiais destinados ao reprocessamento', true, 15, false, 1),
  ('9c47c2e5-0bb2-5686-a36b-85ead511eee9'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.2.4] Ordenado, linear e sem cruzamento', true, 16, false, 1),
  ('46584297-7d2b-5c0d-883d-32096753c81e'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '4.3 — ROTULAGEM E ARMAZENAMENTO DO PRODUTO-FINAL', false, 17, true, 1),
  ('e1a3b9a2-8c85-598a-8e69-472f7b46541d'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.1] Dizeres de rotulagem com identificação visível e de acordo com a legislação vigente', true, 18, false, 1),
  ('b48c421e-241f-5c79-adde-6b19c94a1c7a'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.2] Produto final acondicionado em embalagens adequadas e íntegras', true, 19, false, 1),
  ('027c5e67-de25-595d-85e6-be3592dff430'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.3] Alimentos armazenados separados por tipo ou grupo, sobre estrados distantes do piso, ou sobre paletes, bem conservados e limpos ou sobre outro sistema aprovado, afastados das paredes e distantes do teto de forma a permitir apropriada higienização, iluminação e circulação de ar', true, 20, false, 1),
  ('9369beee-df26-5c8d-86df-250a25592155'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.4] Ausência de material estranho, estragado ou tóxico', true, 21, false, 1),
  ('13ec313f-8898-5c47-9812-5ca32071182e'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.5] Armazenamento em local limpo e conservado', true, 22, false, 1),
  ('9c43049f-0028-5ada-871b-d20f26e184a2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.6] Controle adequado e existência de planilha de registro de temperatura, para ambientes com controle térmico', true, 23, false, 1),
  ('4e511a0b-af3e-5ad7-b098-21bfcb78bbbf'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.7] Rede de frio adequada ao volume e aos diferentes tipos de alimentos', true, 24, false, 1),
  ('b6b2ca99-ad08-5713-9b6b-3ec99d4ef46b'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.8] Produtos avariados, com prazo de validade vencido, devolvidos ou recolhidos do mercado devidamente identificados e armazenados em local separado e de forma organizada', true, 25, false, 1),
  ('a74e74ef-0954-57df-bd45-732e07bfa78d'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.3.9] Produtos finais aguardando resultado analítico ou em quarentena e aqueles aprovados devidamente identificados', true, 26, false, 1),
  ('369db075-0007-54ef-a53e-f61e292c6709'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '4.4 — CONTROLE DE QUALIDADE DO PRODUTO FINAL', false, 27, true, 1),
  ('d98a92b3-34b2-57fe-a564-2ea7a279987d'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.4.1] Existência de controle de qualidade do produto final', true, 28, false, 1),
  ('8d9d8832-b019-5145-95a8-c96c02986057'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.4.2] Existência de programa de amostragem para análise laboratorial do produto final', true, 29, false, 1),
  ('2a384d4d-4dac-5662-b03a-01e5fda2b864'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.4.3] Existência de laudo laboratorial atestando o controle de qualidade do produto final, assinado pelo técnico da empresa responsável pela análise ou expedido por empresa terceirizada', true, 30, false, 1),
  ('fab906e2-fe11-5102-8c81-ad7d251c6671'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.4.4] Existência de equipamentos e materiais necessários para análise do produto final realizadas no estabelecimento', true, 31, false, 1),
  ('a1e6dfb6-39e8-55c5-9e5f-90b0258352b1'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '4.5 — TRANSPORTE DO PRODUTO FINAL', false, 32, true, 1),
  ('190360d4-73fc-57c7-a887-e66beaeb66a8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.5.1] Produto transportado na temperatura especificada no rótulo', true, 33, false, 1),
  ('e61f3516-5d5a-5a05-9a5e-0436d3b10d9c'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.5.2] Veículo limpo, com cobertura para proteção de carga. Ausência de vetores e pragas urbanas ou qualquer evidência de sua presença como fezes, ninhos e outros', true, 34, false, 1),
  ('676aec4a-cabd-56bf-a61f-c27327b6aaf2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.5.3] Transporte mantém a integridade do produto', true, 35, false, 1)
on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;
insert into public.checklist_template_items
  (id, section_id, description, is_required, position, is_structure_only, peso)
values
  ('4a07c425-10da-5cce-bf14-7938449dff1e'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.5.4] Veículo não transporta outras cargas que comprometam a segurança do produto', true, 36, false, 1),
  ('24c9aa75-3412-55cf-9dcd-486577284bb2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d04'::uuid, '[4.5.5] Presença de equipamento para controle de temperatura quando se transporta alimentos que necessitam de condições especiais de conservação', true, 37, false, 1),
  ('e1929e71-643f-524c-b54c-d6556b8e4bc9'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.1 — MANUAL DE BOAS PRÁTICAS DE FABRICAÇÃO', false, 0, true, 1),
  ('34883da1-2175-5bef-a4c1-398f88cc6cbb'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.1.1] Operações executadas no estabelecimento estão de acordo com o Manual de Boas Práticas de Fabricação', true, 1, false, 1),
  ('5cb1393d-0c9b-542e-a7c0-044c8dfca8a8'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2 — PROCEDIMENTOS OPERACIONAIS PADRONIZADOS', false, 2, true, 1),
  ('0c3f033a-e16b-5ef2-82b6-506fd3f0a630'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.1 — Higienização das instalações, equipamentos e utensílios', false, 3, true, 1),
  ('db599831-00cc-51e5-9476-10a05de3ea26'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.1.1] Existência de POP estabelecido para este item', true, 4, false, 1),
  ('a0f5d1a3-d8c1-53c7-945e-95995ffad1ac'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.1.2] O POP descrito está sendo cumprido', true, 5, false, 1),
  ('59e488aa-d163-5305-ab58-1d68dbe1b6da'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.2 — Controle de potabilidade da água', false, 6, true, 1),
  ('bc62dd85-9798-5e24-8852-08f654fec487'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.2.1] Existência de POP estabelecido para controle de potabilidade da água', true, 7, false, 1),
  ('17ca944a-214e-5271-b6e2-27e2a5821035'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.2.2] O POP descrito está sendo cumprido', true, 8, false, 1),
  ('e9ebeb1c-6fcc-5796-8dcf-9164df867309'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.3 — Higiene e saúde dos manipuladores', false, 9, true, 1),
  ('18d4a4e1-5735-5844-8738-8f6f8beda994'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.3.1] Existência de POP estabelecido para este item', true, 10, false, 1),
  ('2a1cdab2-7661-5673-8dd3-6e237a7488b5'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.3.2] O POP descrito está sendo cumprido', true, 11, false, 1),
  ('a2a38061-3fc0-53cf-ab0d-b339796a9deb'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.4 — Manejo dos resíduos', false, 12, true, 1),
  ('160832a0-3238-57fb-b783-024765806ab1'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.4.1] Existência de POP estabelecido para este item', true, 13, false, 1),
  ('02a3e2a8-49e1-5f9b-be00-be83a0e421c6'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.4.2] O POP descrito está sendo cumprido', true, 14, false, 1),
  ('22ad5688-c3b8-5fbd-ba5e-01800e99ee26'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.5 — Manutenção preventiva e calibração de equipamentos.', false, 15, true, 1),
  ('30f8672a-682d-5a48-bb2c-8024787cb6ce'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.5.1] Existência de POP estabelecido para este item', true, 16, false, 1),
  ('21389dd5-1000-5c1f-94be-6db847502cca'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.5.2] O POP descrito está sendo cumprido', true, 17, false, 1),
  ('52db8bc8-d6c3-552d-8610-9e4f3f9c0b55'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.6 — Controle integrado de vetores e pragas urbanas', false, 18, true, 1),
  ('e53909a7-4436-5260-bc54-ea250bf03ba0'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.6.1] Existência de POP estabelecido para este item', true, 19, false, 1),
  ('665ed00b-668d-5369-9a78-97db0fbc6feb'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.6.2] O POP descrito está sendo cumprido', true, 20, false, 1),
  ('77fecaa4-b3ab-5e6a-a5ef-ecf89dc38d62'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.7 — Seleção das matérias-primas, ingredientes e embalagens', false, 21, true, 1),
  ('f6d27e2b-157b-5a0c-9044-6b9efbe914f2'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.7.1] Existência de POP estabelecido para este item', true, 22, false, 1),
  ('d10d03e1-a4a7-5a6c-a23c-d8bd8ceccb5d'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.7.2] O POP descrito está sendo cumprido', true, 23, false, 1),
  ('6c1b6ac4-b4b5-57b3-83dd-91d3dd015a53'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '5.2.8 — Programa de recolhimento de alimentos', false, 24, true, 1),
  ('c8ac1252-0e66-5bdc-b51f-4f0e340c116b'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.8.1] Existência de POP estabelecido para este item', true, 25, false, 1),
  ('2ebdb6bf-38e1-5619-8c17-9ea338e44e4c'::uuid, 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380d05'::uuid, '[5.2.8.2] O POP descrito está sendo cumprido', true, 26, false, 1)
on conflict (id) do update set
  section_id = excluded.section_id,
  description = excluded.description,
  is_required = excluded.is_required,
  position = excluded.position,
  is_structure_only = excluded.is_structure_only,
  peso = excluded.peso;