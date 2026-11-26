-- Emergency emails.
--
-- Emergency notifications are also sent by email (Resend) from the server.
-- claim_notification_emails() hands the server the unsent ones with the
-- recipient's address and marks them in the same statement, so two server
-- runs never send the same email twice. Shared demo accounts never get
-- email, so public demo visitors cannot make the app send mail.

alter table public.notifications add column emailed_at timestamptz;

create function public.claim_notification_emails(p_limit integer default 10)
returns table (id uuid, title text, link text, email text)
language sql
security definer
set search_path = ''
as $$
  with claimable as (
    select n.id
    from public.notifications n
    where n.type = 'request_emergency'
      and n.emailed_at is null
      and n.created_at > now() - interval '1 day'
      and not exists (select 1 from private.demo_accounts d where d.user_id = n.user_id)
    order by n.created_at
    limit least(greatest(p_limit, 0), 50)
    for update of n skip locked
  )
  update public.notifications n
  set emailed_at = now()
  from claimable c, auth.users u
  where n.id = c.id and u.id = n.user_id and u.email is not null
  returning n.id, n.title, n.link, u.email::text;
$$;

revoke all on function public.claim_notification_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_emails(integer) to service_role;
