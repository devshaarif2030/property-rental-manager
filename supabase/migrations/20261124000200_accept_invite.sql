-- Accepting an invite. Called by server code with the service role after it has
-- created the auth user, so the profile insert and marking the invite used
-- happen in one transaction. Clients cannot call it.

create function public.accept_invite(
  p_token_hash text,
  p_user_id uuid,
  p_full_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.invites;
  v_user_email text;
  v_profile public.profiles;
begin
  select * into v_invite
  from public.invites
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite_already_accepted' using errcode = 'P0001';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  select lower(email) into v_user_email from auth.users where id = p_user_id;
  if v_user_email is distinct from v_invite.email then
    raise exception 'invite_email_mismatch' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, org_id, role, full_name)
  values (p_user_id, v_invite.org_id, v_invite.role, trim(p_full_name))
  returning * into v_profile;

  update public.invites set accepted_at = now() where id = v_invite.id;

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, meta)
  values (
    v_invite.org_id, p_user_id, 'invite.accepted', 'invite', v_invite.id,
    jsonb_build_object('role', v_invite.role, 'invited_by', v_invite.invited_by)
  );

  return v_profile;
end;
$$;

revoke all on function public.accept_invite(text, uuid, text) from public, anon, authenticated;
grant execute on function public.accept_invite(text, uuid, text) to service_role;
