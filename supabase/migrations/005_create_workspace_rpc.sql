-- Create the first organization and owner membership atomically.
-- This avoids the RLS bootstrap cycle where a user must already be an
-- organization member before they are allowed to insert the organization.

create or replace function public.create_workspace(
  workspace_name text,
  workspace_slug text
)
returns table (
  id uuid,
  name text,
  slug text,
  created_at timestamptz,
  role text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  new_organization public.organizations%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if nullif(btrim(workspace_name), '') is null then
    raise exception 'workspace name is required' using errcode = '22023';
  end if;

  if workspace_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'workspace slug is invalid' using errcode = '22023';
  end if;

  insert into public.organizations (name, slug)
  values (btrim(workspace_name), workspace_slug)
  returning * into new_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization.id, current_user_id, 'owner');

  return query
  select
    new_organization.id,
    new_organization.name,
    new_organization.slug,
    new_organization.created_at,
    'owner'::text;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
revoke all on function public.create_workspace(text, text) from anon;
grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.create_workspace(text, text) to service_role;
