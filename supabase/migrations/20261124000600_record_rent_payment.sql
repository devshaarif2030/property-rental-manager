-- Recording Stripe payments. Server code creates a pending payment when a
-- tenant starts Checkout; the verified Stripe webhook is the only caller of
-- these functions, using the service role. Clients cannot call them.

-- Marks a pending payment succeeded and its rent charge paid, in one
-- transaction. Idempotent on the Checkout Session id: Stripe can deliver the
-- same event more than once, and a replay changes nothing.
-- Returns true when this call recorded the payment, false for a replay.
create function public.record_rent_payment(
  p_session_id text,
  p_payment_intent text,
  p_amount_cents integer,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_currency text;
  v_charge_was_paid boolean;
begin
  select * into v_payment
  from public.payments
  where stripe_session_id = p_session_id
  for update;

  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;
  if v_payment.status = 'succeeded' then
    return false;
  end if;

  select o.currency into v_currency from public.organizations o where o.id = v_payment.org_id;
  if p_amount_cents is distinct from v_payment.amount_cents
     or lower(p_currency) is distinct from lower(v_currency) then
    raise exception 'payment_amount_mismatch' using errcode = 'P0001';
  end if;

  select status = 'paid' into v_charge_was_paid
  from public.rent_charges
  where id = v_payment.rent_charge_id
  for update;

  update public.payments
  set status = 'succeeded', paid_at = now(), stripe_payment_intent = nullif(p_payment_intent, '')
  where id = v_payment.id;

  update public.rent_charges set status = 'paid' where id = v_payment.rent_charge_id;

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, meta)
  values (
    v_payment.org_id, null, 'payment.succeeded', 'payment', v_payment.id,
    jsonb_build_object(
      'rent_charge_id', v_payment.rent_charge_id,
      'amount_cents', v_payment.amount_cents,
      'stripe_session_id', p_session_id,
      -- A second Checkout for an already paid charge; flag it for a refund.
      'charge_already_paid', v_charge_was_paid
    )
  );

  return true;
end;
$$;

-- An expired or failed Checkout Session leaves its charge unpaid.
create function public.fail_rent_payment(p_session_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set status = 'failed'
  where stripe_session_id = p_session_id and status = 'pending';
$$;

revoke all on function public.record_rent_payment(text, text, integer, text) from public, anon, authenticated;
revoke all on function public.fail_rent_payment(text) from public, anon, authenticated;
grant execute on function public.record_rent_payment(text, text, integer, text) to service_role;
grant execute on function public.fail_rent_payment(text) to service_role;
