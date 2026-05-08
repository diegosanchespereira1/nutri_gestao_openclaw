-- Performance hardening for checklist flow + RLS initplan optimization on profiles.
-- NOTE: This migration is created only; do not execute against Supabase yet.

begin;

-- ---------------------------------------------------------------------------
-- 1) Foreign key covering indexes (advisor: unindexed_foreign_keys)
-- ---------------------------------------------------------------------------

-- checklist_fill_sessions
create index if not exists checklist_fill_sessions_establishment_fk_idx
  on public.checklist_fill_sessions (establishment_id);

create index if not exists checklist_fill_sessions_template_fk_idx
  on public.checklist_fill_sessions (template_id)
  where template_id is not null;

create index if not exists checklist_fill_sessions_custom_template_fk_idx
  on public.checklist_fill_sessions (custom_template_id)
  where custom_template_id is not null;

-- checklist_fill_item_responses
create index if not exists checklist_fill_item_responses_template_item_fk_idx
  on public.checklist_fill_item_responses (template_item_id)
  where template_item_id is not null;

create index if not exists checklist_fill_item_responses_custom_item_fk_idx
  on public.checklist_fill_item_responses (custom_item_id)
  where custom_item_id is not null;

create index if not exists checklist_fill_item_responses_workspace_item_fk_idx
  on public.checklist_fill_item_responses (workspace_item_id)
  where workspace_item_id is not null;

-- checklist_fill_item_photos
create index if not exists checklist_fill_item_photos_user_fk_idx
  on public.checklist_fill_item_photos (user_id);

create index if not exists checklist_fill_item_photos_template_item_fk_idx
  on public.checklist_fill_item_photos (template_item_id)
  where template_item_id is not null;

create index if not exists checklist_fill_item_photos_custom_item_fk_idx
  on public.checklist_fill_item_photos (custom_item_id)
  where custom_item_id is not null;

create index if not exists checklist_fill_item_photos_workspace_item_fk_idx
  on public.checklist_fill_item_photos (workspace_item_id)
  where workspace_item_id is not null;

-- ---------------------------------------------------------------------------
-- 2) RLS auth initplan optimization on profiles
--    Replace auth.uid() with (select auth.uid()) to avoid per-row re-evaluation.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
