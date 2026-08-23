-- ============================================================
-- TRAVEL CREW V2 - STAGE 8 HOTFIX 4
-- Preferred display names + uploaded trip hero images
-- Run ONCE in Supabase -> SQL Editor before deploying the code.
-- ============================================================

begin;

-- Owner may set the preferred app display name for any Travel Crew user.
create or replace function public.owner_set_user_display_name(
  p_user_id uuid,
  p_display_name text,
  p_first_name text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not public.stage8_is_owner() then
    raise exception 'Owner access required.';
  end if;

  v_name := trim(coalesce(p_display_name,''));
  if v_name = '' then
    raise exception 'Display name cannot be blank.';
  end if;
  if length(v_name) > 80 then
    raise exception 'Display name is too long.';
  end if;

  update public.profiles
  set
    display_name = v_name,
    first_name = coalesce(nullif(trim(coalesce(p_first_name,'')),''), first_name)
  where id = p_user_id;

  insert into public.audit_log(user_id,action,entity_type,entity_id,detail)
  values(
    auth.uid(),
    'owner_user_display_name_changed',
    'profile',
    p_user_id,
    jsonb_build_object('display_name',v_name)
  );

  return true;
end;
$$;

grant execute on function public.owner_set_user_display_name(uuid,text,text) to authenticated;

-- Stable public cover-photo bucket. It contains trip decorative cover images
-- only; passports/documents continue to use the existing PRIVATE buckets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'trip-covers',
  'trip-covers',
  true,
  15728640,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict(id) do update
set
  name=excluded.name,
  public=true,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Anyone may read a public trip cover once they know the URL, but ONLY
-- editable trip members can upload/change/delete files in that trip folder.
drop policy if exists "trip_covers_insert" on storage.objects;
create policy "trip_covers_insert"
on storage.objects for insert
to authenticated
with check(
  bucket_id='trip-covers'
  and app_private.can_edit_trip(
    app_private.safe_uuid((storage.foldername(name))[1])
  )
);

drop policy if exists "trip_covers_update" on storage.objects;
create policy "trip_covers_update"
on storage.objects for update
to authenticated
using(
  bucket_id='trip-covers'
  and app_private.can_edit_trip(
    app_private.safe_uuid((storage.foldername(name))[1])
  )
)
with check(
  bucket_id='trip-covers'
  and app_private.can_edit_trip(
    app_private.safe_uuid((storage.foldername(name))[1])
  )
);

drop policy if exists "trip_covers_delete" on storage.objects;
create policy "trip_covers_delete"
on storage.objects for delete
to authenticated
using(
  bucket_id='trip-covers'
  and app_private.can_edit_trip(
    app_private.safe_uuid((storage.foldername(name))[1])
  )
);

commit;
