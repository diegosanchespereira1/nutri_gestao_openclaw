-- Workspace / equipe: titular + membros autenticados partilham o mesmo tenant.

create or replace function public.workspace_account_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select tm.owner_user_id
      from public.team_members tm
      where tm.member_user_id = (select auth.uid())
      limit 1
    ),
    (select auth.uid())
  );
$$;

grant execute on function public.workspace_account_owner_id() to authenticated;

create or replace function public.workspace_member_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_account_owner_id()
  union
  select tm.member_user_id
  from public.team_members tm
  where tm.owner_user_id = public.workspace_account_owner_id()
    and tm.member_user_id is not null;
$$;

grant execute on function public.workspace_member_user_ids() to authenticated;

-- team_members: leitura para toda a equipa; escrita só pelo titular da conta
drop policy if exists "team_members_select_own" on public.team_members;
drop policy if exists "team_members_insert_own" on public.team_members;
drop policy if exists "team_members_update_own" on public.team_members;
drop policy if exists "team_members_delete_own" on public.team_members;

create policy "team_members_select_own"
  on public.team_members for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "team_members_insert_own"
  on public.team_members for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "team_members_update_own"
  on public.team_members for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "team_members_delete_own"
  on public.team_members for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- clients
drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;
drop policy if exists "clients_select_admin" on public.clients;

create policy "clients_select_own"
  on public.clients for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "clients_insert_own"
  on public.clients for insert
  to authenticated
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  )
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "clients_delete_own"
  on public.clients for delete
  to authenticated
  using (
    owner_user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "clients_select_admin"
  on public.clients for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  );

-- establishments
drop policy if exists "establishments_select_own" on public.establishments;
drop policy if exists "establishments_insert_own" on public.establishments;
drop policy if exists "establishments_update_own" on public.establishments;
drop policy if exists "establishments_delete_own" on public.establishments;

create policy "establishments_select_own"
  on public.establishments for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "establishments_insert_own"
  on public.establishments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishments_update_own"
  on public.establishments for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishments_delete_own"
  on public.establishments for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

-- patients (tenant = user_id do titular da conta)
drop policy if exists "patients_select_own" on public.patients;
drop policy if exists "patients_insert_own" on public.patients;
drop policy if exists "patients_update_own" on public.patients;
drop policy if exists "patients_delete_own" on public.patients;
drop policy if exists "patients_select_admin" on public.patients;

create policy "patients_select_own"
  on public.patients for select
  to authenticated
  using (user_id = (select public.workspace_account_owner_id()));

create policy "patients_insert_own"
  on public.patients for insert
  to authenticated
  with check (
    user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "patients_update_own"
  on public.patients for update
  to authenticated
  using (
    user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  )
  with check (
    user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "patients_delete_own"
  on public.patients for delete
  to authenticated
  using (
    user_id = (select public.workspace_account_owner_id())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "patients_select_admin"
  on public.patients for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  );

-- scheduled_visits
drop policy if exists "scheduled_visits_select_own" on public.scheduled_visits;
drop policy if exists "scheduled_visits_insert_own" on public.scheduled_visits;
drop policy if exists "scheduled_visits_update_own" on public.scheduled_visits;
drop policy if exists "scheduled_visits_delete_own" on public.scheduled_visits;
drop policy if exists "scheduled_visits_select_admin" on public.scheduled_visits;

create policy "scheduled_visits_select_own"
  on public.scheduled_visits for select
  to authenticated
  using (
    user_id in (select public.workspace_member_user_ids())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "scheduled_visits_insert_own"
  on public.scheduled_visits for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (
      assigned_team_member_id is null
      or exists (
        select 1
        from public.team_members tm
        where
          tm.id = assigned_team_member_id
          and tm.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
    and (
      (
        target_type = 'establishment'
        and exists (
          select 1
          from public.establishments e
          join public.clients c on c.id = e.client_id
          where
            e.id = establishment_id
            and c.owner_user_id = (select public.workspace_account_owner_id())
        )
      )
      or (
        target_type = 'patient'
        and exists (
          select 1
          from public.patients p
          join public.clients c on c.id = p.client_id
          where
            p.id = patient_id
            and c.owner_user_id = (select public.workspace_account_owner_id())
        )
      )
    )
  );

create policy "scheduled_visits_update_own"
  on public.scheduled_visits for update
  to authenticated
  using (
    user_id in (select public.workspace_member_user_ids())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  )
  with check (
    user_id in (select public.workspace_member_user_ids())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (
      assigned_team_member_id is null
      or exists (
        select 1
        from public.team_members tm
        where
          tm.id = assigned_team_member_id
          and tm.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
    and (
      (
        target_type = 'establishment'
        and exists (
          select 1
          from public.establishments e
          join public.clients c on c.id = e.client_id
          where
            e.id = establishment_id
            and c.owner_user_id = (select public.workspace_account_owner_id())
        )
      )
      or (
        target_type = 'patient'
        and exists (
          select 1
          from public.patients p
          join public.clients c on c.id = p.client_id
          where
            p.id = patient_id
            and c.owner_user_id = (select public.workspace_account_owner_id())
        )
      )
    )
  );

create policy "scheduled_visits_delete_own"
  on public.scheduled_visits for delete
  to authenticated
  using (
    user_id in (select public.workspace_member_user_ids())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

create policy "scheduled_visits_select_admin"
  on public.scheduled_visits for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  );

-- Storage: logos de cliente — pasta = titular da conta (mesmo prefixo para a equipa)
drop policy if exists "client_logos_insert_own" on storage.objects;
drop policy if exists "client_logos_select_own" on storage.objects;
drop policy if exists "client_logos_update_own" on storage.objects;
drop policy if exists "client_logos_delete_own" on storage.objects;

create policy "client_logos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "client_logos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "client_logos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  )
  with check (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "client_logos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

-- Storage: exames PF — pasta = titular da conta
drop policy if exists "client_exams_insert_own" on storage.objects;
drop policy if exists "client_exams_select_own" on storage.objects;
drop policy if exists "client_exams_update_own" on storage.objects;
drop policy if exists "client_exams_delete_own" on storage.objects;

create policy "client_exams_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "client_exams_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "client_exams_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  )
  with check (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "client_exams_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

-- Storage: fotos de checklist — pasta = titular da conta
drop policy if exists "checklist_fill_photos_storage_insert" on storage.objects;
drop policy if exists "checklist_fill_photos_storage_select" on storage.objects;
drop policy if exists "checklist_fill_photos_storage_update" on storage.objects;
drop policy if exists "checklist_fill_photos_storage_delete" on storage.objects;

create policy "checklist_fill_photos_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "checklist_fill_photos_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "checklist_fill_photos_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  )
  with check (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "checklist_fill_photos_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

-- Storage: PDFs do dossiê de checklist
drop policy if exists "checklist_dossier_pdfs_storage_insert" on storage.objects;
drop policy if exists "checklist_dossier_pdfs_storage_select" on storage.objects;
drop policy if exists "checklist_dossier_pdfs_storage_delete" on storage.objects;

create policy "checklist_dossier_pdfs_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'checklist-dossier-pdfs'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "checklist_dossier_pdfs_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'checklist-dossier-pdfs'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "checklist_dossier_pdfs_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'checklist-dossier-pdfs'
    and (storage.foldername (name))[1] = (select public.workspace_account_owner_id())::text
  );


drop policy if exists "checklist_fill_sessions_select_own" on public.checklist_fill_sessions;
drop policy if exists "checklist_fill_sessions_insert_own" on public.checklist_fill_sessions;
drop policy if exists "checklist_fill_sessions_update_own" on public.checklist_fill_sessions;
drop policy if exists "checklist_fill_sessions_delete_own" on public.checklist_fill_sessions;
drop policy if exists "checklist_fill_item_responses_select_own" on public.checklist_fill_item_responses;
drop policy if exists "checklist_fill_item_responses_insert_own" on public.checklist_fill_item_responses;
drop policy if exists "checklist_fill_item_responses_update_own" on public.checklist_fill_item_responses;
drop policy if exists "checklist_fill_item_responses_delete_own" on public.checklist_fill_item_responses;

create policy "checklist_fill_sessions_select_own"
  on public.checklist_fill_sessions for select
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_fill_sessions_insert_own"
  on public.checklist_fill_sessions for insert
  to authenticated
  with check (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_fill_sessions_update_own"
  on public.checklist_fill_sessions for update
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()))
  with check (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_fill_sessions_delete_own"
  on public.checklist_fill_sessions for delete
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_fill_item_responses_select_own"
  on public.checklist_fill_item_responses for select
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );

create policy "checklist_fill_item_responses_insert_own"
  on public.checklist_fill_item_responses for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );

create policy "checklist_fill_item_responses_update_own"
  on public.checklist_fill_item_responses for update
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );

create policy "checklist_fill_item_responses_delete_own"
  on public.checklist_fill_item_responses for delete
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );



drop policy if exists "checklist_fill_sessions_select_establishment_owner" on public.checklist_fill_sessions;

create policy "checklist_fill_sessions_select_establishment_owner"
  on public.checklist_fill_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments est
      join public.clients cl on cl.id = est.client_id
      where
        est.id = checklist_fill_sessions.establishment_id
        and cl.owner_user_id = (select public.workspace_account_owner_id())
    )
  );


drop policy if exists "checklist_establishment_recent_select_own" on public.checklist_establishment_recent;
drop policy if exists "checklist_establishment_recent_insert_own" on public.checklist_establishment_recent;
drop policy if exists "checklist_establishment_recent_update_own" on public.checklist_establishment_recent;
drop policy if exists "checklist_establishment_recent_delete_own" on public.checklist_establishment_recent;
create policy "checklist_establishment_recent_select_own"
  on public.checklist_establishment_recent for select
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_establishment_recent_insert_own"
  on public.checklist_establishment_recent for insert
  to authenticated
  with check (
    user_id in (select public.workspace_member_user_ids())
    and exists (
      select 1
      from public.establishments e
      inner join public.clients c
        on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id in (select public.workspace_member_user_ids())
        and c.kind = 'pj'
    )
  );

create policy "checklist_establishment_recent_update_own"
  on public.checklist_establishment_recent for update
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()))
  with check (
    user_id in (select public.workspace_member_user_ids())
    and exists (
      select 1
      from public.establishments e
      inner join public.clients c
        on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id in (select public.workspace_member_user_ids())
        and c.kind = 'pj'
    )
  );

create policy "checklist_establishment_recent_delete_own"
  on public.checklist_establishment_recent for delete
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()));



-- RLS: technical_recipes
drop policy if exists "technical_recipes_select_own" on public.technical_recipes;
drop policy if exists "technical_recipes_insert_own" on public.technical_recipes;
drop policy if exists "technical_recipes_update_own" on public.technical_recipes;
drop policy if exists "technical_recipes_delete_own" on public.technical_recipes;

create policy "technical_recipes_select_own"
  on public.technical_recipes for select
  to authenticated
  using (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
  );

create policy "technical_recipes_insert_own"
  on public.technical_recipes for insert
  to authenticated
  with check (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
  );

create policy "technical_recipes_update_own"
  on public.technical_recipes for update
  to authenticated
  using (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
  )
  with check (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
  );

create policy "technical_recipes_delete_own"
  on public.technical_recipes for delete
  to authenticated
  using (
    (
      establishment_id is not null
      and exists (
        select 1
        from public.establishments e
        join public.clients c on c.id = e.client_id
        where
          e.id = establishment_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
    or (
      establishment_id is null
      and exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
      )
    )
  );

-- RLS: technical_recipe_lines (acesso via receita com estabelecimento OU só cliente)
drop policy if exists "technical_recipe_lines_select_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_insert_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_update_own" on public.technical_recipe_lines;
drop policy if exists "technical_recipe_lines_delete_own" on public.technical_recipe_lines;

create policy "technical_recipe_lines_select_own"
  on public.technical_recipe_lines for select
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
            )
          )
        )
    )
  );

create policy "technical_recipe_lines_insert_own"
  on public.technical_recipe_lines for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
                and c.kind = 'pj'
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
                and c.kind = 'pj'
            )
          )
        )
    )
  );

create policy "technical_recipe_lines_update_own"
  on public.technical_recipe_lines for update
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
                and c.kind = 'pj'
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
                and c.kind = 'pj'
            )
          )
        )
    )
  );

create policy "technical_recipe_lines_delete_own"
  on public.technical_recipe_lines for delete
  to authenticated
  using (
    exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              join public.clients c on c.id = e.client_id
              where
                e.id = r.establishment_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
            )
          )
          or (
            r.establishment_id is null
            and exists (
              select 1
              from public.clients c
              where
                c.id = r.client_id
                and c.owner_user_id = (select public.workspace_account_owner_id())
            )
          )
        )
    )
  );

-- Favoritos: permitir templates ao nível do cliente (sem estabelecimento).
drop policy if exists "technical_recipe_template_favorites_insert_own"
  on public.technical_recipe_template_favorites;

create policy "technical_recipe_template_favorites_insert_own"
  on public.technical_recipe_template_favorites for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and exists (
      select 1
      from public.technical_recipes r
      where
        r.id = recipe_id
        and r.is_template = true
        and (
          (
            r.establishment_id is not null
            and exists (
              select 1
              from public.establishments e
              where
                e.id = r.establishment_id
                and e.client_id = client_id
            )
          )
          or (
            r.establishment_id is null
            and r.client_id = client_id
          )
        )
    )
  );



drop policy if exists "technical_recipe_template_favorites_select_own"
  on public.technical_recipe_template_favorites;
drop policy if exists "technical_recipe_template_favorites_delete_own"
  on public.technical_recipe_template_favorites;

create policy "technical_recipe_template_favorites_select_own"
  on public.technical_recipe_template_favorites for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "technical_recipe_template_favorites_delete_own"
  on public.technical_recipe_template_favorites for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );


drop policy if exists "checklist_fill_item_photos_select_own" on public.checklist_fill_item_photos;
drop policy if exists "checklist_fill_item_photos_insert_own" on public.checklist_fill_item_photos;
drop policy if exists "checklist_fill_item_photos_delete_own" on public.checklist_fill_item_photos;
create policy "checklist_fill_item_photos_select_own"
  on public.checklist_fill_item_photos for select
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );

create policy "checklist_fill_item_photos_insert_own"
  on public.checklist_fill_item_photos for insert
  to authenticated
  with check (
    user_id in (select public.workspace_member_user_ids())
    and exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );

create policy "checklist_fill_item_photos_delete_own"
  on public.checklist_fill_item_photos for delete
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );



drop policy if exists "checklist_fill_pdf_exports_select_own" on public.checklist_fill_pdf_exports;
drop policy if exists "checklist_fill_pdf_exports_insert_own" on public.checklist_fill_pdf_exports;
drop policy if exists "checklist_fill_pdf_exports_update_own" on public.checklist_fill_pdf_exports;
create policy "checklist_fill_pdf_exports_select_own"
  on public.checklist_fill_pdf_exports for select
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_fill_pdf_exports_insert_own"
  on public.checklist_fill_pdf_exports for insert
  to authenticated
  with check (
    user_id in (select public.workspace_member_user_ids())
    and exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id in (select public.workspace_member_user_ids())
    )
  );

create policy "checklist_fill_pdf_exports_update_own"
  on public.checklist_fill_pdf_exports for update
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()))
  with check (user_id in (select public.workspace_member_user_ids()));



drop policy if exists "financial_charges_select_own" on public.financial_charges;
drop policy if exists "financial_charges_insert_own" on public.financial_charges;
drop policy if exists "financial_charges_update_own" on public.financial_charges;
drop policy if exists "financial_charges_delete_own" on public.financial_charges;
create policy "financial_charges_select_own"
  on public.financial_charges for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "financial_charges_insert_own"
  on public.financial_charges for insert
  to authenticated
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "financial_charges_update_own"
  on public.financial_charges for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "financial_charges_delete_own"
  on public.financial_charges for delete
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));



drop policy if exists "client_contracts_select_own" on public.client_contracts;
drop policy if exists "client_contracts_insert_own" on public.client_contracts;
drop policy if exists "client_contracts_update_own" on public.client_contracts;
drop policy if exists "client_contracts_delete_own" on public.client_contracts;
create policy "client_contracts_select_own"
  on public.client_contracts for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "client_contracts_insert_own"
  on public.client_contracts for insert
  to authenticated
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "client_contracts_update_own"
  on public.client_contracts for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "client_contracts_delete_own"
  on public.client_contracts for delete
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));



drop policy if exists "professional_raw_materials_select_own" on public.professional_raw_materials;
drop policy if exists "professional_raw_materials_insert_own" on public.professional_raw_materials;
drop policy if exists "professional_raw_materials_update_own" on public.professional_raw_materials;
drop policy if exists "professional_raw_materials_delete_own" on public.professional_raw_materials;
create policy "professional_raw_materials_select_own"
  on public.professional_raw_materials for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "professional_raw_materials_insert_own"
  on public.professional_raw_materials for insert
  to authenticated
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "professional_raw_materials_update_own"
  on public.professional_raw_materials for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "professional_raw_materials_delete_own"
  on public.professional_raw_materials for delete
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));



drop policy if exists "establishment_compliance_deadlines_select_own" on public.establishment_compliance_deadlines;
drop policy if exists "establishment_compliance_deadlines_insert_own" on public.establishment_compliance_deadlines;
drop policy if exists "establishment_compliance_deadlines_update_own" on public.establishment_compliance_deadlines;
drop policy if exists "establishment_compliance_deadlines_delete_own" on public.establishment_compliance_deadlines;
create policy "establishment_compliance_deadlines_select_own"
  on public.establishment_compliance_deadlines for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "establishment_compliance_deadlines_insert_own"
  on public.establishment_compliance_deadlines for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishment_compliance_deadlines_update_own"
  on public.establishment_compliance_deadlines for update
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishment_compliance_deadlines_delete_own"
  on public.establishment_compliance_deadlines for delete
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

grant select, insert, update, delete on public.establishment_compliance_deadlines to authenticated;



drop policy if exists "contract_templates_select_authenticated" on public.contract_templates;
drop policy if exists "contract_templates_insert_own" on public.contract_templates;
drop policy if exists "contract_templates_update_own" on public.contract_templates;
drop policy if exists "contract_templates_delete_own" on public.contract_templates;
create policy "contract_templates_select_authenticated"
  on public.contract_templates for select
  to authenticated
  using (
    owner_user_id is null
    or owner_user_id = (select public.workspace_account_owner_id())
  );

-- Profissionais só inserem os seus próprios
create policy "contract_templates_insert_own"
  on public.contract_templates for insert
  to authenticated
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "contract_templates_update_own"
  on public.contract_templates for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "contract_templates_delete_own"
  on public.contract_templates for delete
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));



drop policy if exists "client_exam_documents_select_own" on public.client_exam_documents;
drop policy if exists "client_exam_documents_insert_own" on public.client_exam_documents;
drop policy if exists "client_exam_documents_delete_own" on public.client_exam_documents;
create policy "client_exam_documents_select_own"
  on public.client_exam_documents for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "client_exam_documents_insert_own"
  on public.client_exam_documents for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "client_exam_documents_delete_own"
  on public.client_exam_documents for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );



drop policy if exists "patient_naa_select_own" on public.patient_nutrition_assessments;
drop policy if exists "patient_naa_insert_own" on public.patient_nutrition_assessments;
create policy "patient_naa_select_own"
  on public.patient_nutrition_assessments for select
  to authenticated
  using (
    exists (
      select 1
      from public.patients p
      join public.clients c on c.id = p.client_id
      where
        p.id = patient_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "patient_naa_insert_own"
  on public.patient_nutrition_assessments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.patients p
      join public.clients c on c.id = p.client_id
      where
        p.id = patient_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );



drop policy if exists "checklist_custom_templates_own" on public.checklist_custom_templates;
drop policy if exists "checklist_custom_sections_own" on public.checklist_custom_sections;
drop policy if exists "checklist_custom_items_own" on public.checklist_custom_items;
create policy "checklist_custom_templates_own"
  on public.checklist_custom_templates for all
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()))
  with check (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_custom_sections_own"
  on public.checklist_custom_sections for all
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_custom_templates t
      where
        t.id = custom_template_id
        and t.user_id in (select public.workspace_member_user_ids())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_custom_templates t
      where
        t.id = custom_template_id
        and t.user_id in (select public.workspace_member_user_ids())
    )
  );

create policy "checklist_custom_items_own"
  on public.checklist_custom_items for all
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_custom_sections s
      join public.checklist_custom_templates t on t.id = s.custom_template_id
      where
        s.id = custom_section_id
        and t.user_id in (select public.workspace_member_user_ids())
    )
  )
  with check (
    exists (
      select 1
      from public.checklist_custom_sections s
      join public.checklist_custom_templates t on t.id = s.custom_template_id
      where
        s.id = custom_section_id
        and t.user_id in (select public.workspace_member_user_ids())
    )
  );

grant select, insert, update, delete on public.checklist_custom_templates to authenticated;
grant select, insert, update, delete on public.checklist_custom_sections to authenticated;
grant select, insert, update, delete on public.checklist_custom_items to authenticated;



drop policy if exists "establishment_pops_select_own" on public.establishment_pops;
drop policy if exists "establishment_pops_insert_own" on public.establishment_pops;
drop policy if exists "establishment_pops_update_own" on public.establishment_pops;
drop policy if exists "establishment_pops_delete_own" on public.establishment_pops;
drop policy if exists "pop_versions_select_own" on public.pop_versions;
drop policy if exists "pop_versions_insert_own" on public.pop_versions;
create policy "establishment_pops_select_own"
  on public.establishment_pops for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "establishment_pops_insert_own"
  on public.establishment_pops for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishment_pops_update_own"
  on public.establishment_pops for update
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

create policy "establishment_pops_delete_own"
  on public.establishment_pops for delete
  to authenticated
  using (
    exists (
      select 1
      from public.establishments e
      join public.clients c on c.id = e.client_id
      where
        e.id = establishment_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

grant select, insert, update, delete on public.establishment_pops to authenticated;

create policy "pop_versions_select_own"
  on public.pop_versions for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishment_pops p
      join public.establishments e on e.id = p.establishment_id
      join public.clients c on c.id = e.client_id
      where
        p.id = pop_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "pop_versions_insert_own"
  on public.pop_versions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.establishment_pops p
      join public.establishments e on e.id = p.establishment_id
      join public.clients c on c.id = e.client_id
      where
        p.id = pop_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
  );

grant select, insert on public.pop_versions to authenticated;

-- Portal externo: políticas alinhadas ao dono da conta (workspace)
drop policy if exists "ext_portal_users_select_own" on public.external_portal_users;
drop policy if exists "ext_portal_users_insert_own" on public.external_portal_users;
drop policy if exists "ext_portal_users_update_own" on public.external_portal_users;
drop policy if exists "ext_portal_users_delete_own" on public.external_portal_users;
drop policy if exists "ext_access_perm_select_own" on public.external_access_permissions;
drop policy if exists "ext_access_perm_insert_own" on public.external_access_permissions;
drop policy if exists "ext_access_perm_update_own" on public.external_access_permissions;
drop policy if exists "ext_access_perm_delete_own" on public.external_access_permissions;
drop policy if exists "patient_consents_select_own" on public.patient_parental_consents;
drop policy if exists "patient_consents_insert_own" on public.patient_parental_consents;
drop policy if exists "patient_consents_update_own" on public.patient_parental_consents;

create policy "ext_portal_users_select_own"
  on public.external_portal_users for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "ext_portal_users_insert_own"
  on public.external_portal_users for insert
  to authenticated
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "ext_portal_users_update_own"
  on public.external_portal_users for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "ext_portal_users_delete_own"
  on public.external_portal_users for delete
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

grant select, insert, update, delete on public.external_portal_users to authenticated;

create policy "ext_access_perm_select_own"
  on public.external_access_permissions for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "ext_access_perm_insert_own"
  on public.external_access_permissions for insert
  to authenticated
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "ext_access_perm_update_own"
  on public.external_access_permissions for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

create policy "ext_access_perm_delete_own"
  on public.external_access_permissions for delete
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

grant select, insert, update, delete on public.external_access_permissions to authenticated;

create policy "patient_consents_select_own"
  on public.patient_parental_consents for select
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()));

create policy "patient_consents_insert_own"
  on public.patient_parental_consents for insert
  to authenticated
  with check (owner_user_id = (select public.workspace_account_owner_id()));

-- Consentimentos não se editam (apenas se revoga com novo registo)
create policy "patient_consents_update_own"
  on public.patient_parental_consents for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (owner_user_id = (select public.workspace_account_owner_id()));

grant select, insert, update on public.patient_parental_consents to authenticated;
