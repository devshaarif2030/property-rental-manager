-- Recording Stripe payments: only the service role can, replays change
-- nothing, and the amount must match.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(14);

-- Two Checkout Sessions for tenant_a1's December charge (a9, 1200.00 USD).
insert into public.payments (id, org_id, rent_charge_id, amount_cents, stripe_session_id) values
  ('00000000-0007-0000-0000-0000000000a9', '00000000-0001-0000-0000-00000000000a',
   '00000000-0006-0000-0000-0000000000a9', 120000, 'cs_test_pending_a9'),
  ('00000000-0007-0000-0000-0000000000a8', '00000000-0001-0000-0000-00000000000a',
   '00000000-0006-0000-0000-0000000000a9', 120000, 'cs_test_expired_a9');

-- Clients cannot record payments ---------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2'); -- tenant_a1
select throws_ok(
  $$ select public.record_rent_payment('cs_test_pending_a9', 'pi_test', 120000, 'usd') $$,
  '42501', null, 'a tenant cannot record their own payment');
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a0'); -- admin_a
select throws_ok(
  $$ select public.record_rent_payment('cs_test_pending_a9', 'pi_test', 120000, 'usd') $$,
  '42501', null, 'an admin cannot record a payment');
select throws_ok(
  $$ select public.fail_rent_payment('cs_test_pending_a9') $$,
  '42501', null, 'an admin cannot fail a payment');
select tests.clear_authentication();

-- The webhook (service role) --------------------------------------------------
set local role service_role;

select throws_ok(
  $$ select public.record_rent_payment('cs_test_pending_a9', 'pi_test', 100, 'usd') $$,
  'P0001', 'payment_amount_mismatch', 'a different amount is refused');
select throws_ok(
  $$ select public.record_rent_payment('cs_test_pending_a9', 'pi_test', 120000, 'gbp') $$,
  'P0001', 'payment_amount_mismatch', 'a different currency is refused');
select throws_ok(
  $$ select public.record_rent_payment('cs_test_unknown', 'pi_test', 120000, 'usd') $$,
  'P0002', 'payment_not_found', 'an unknown session is refused');

select is(
  public.record_rent_payment('cs_test_pending_a9', 'pi_test_a9', 120000, 'USD'), true,
  'the first event records the payment');
select is(
  public.record_rent_payment('cs_test_pending_a9', 'pi_test_a9', 120000, 'usd'), false,
  'a replayed event is ignored');

select public.fail_rent_payment('cs_test_expired_a9');
reset role;

select results_eq(
  $$ select status::text, paid_at is not null, stripe_payment_intent from public.payments
     where stripe_session_id = 'cs_test_pending_a9' $$,
  $$ values ('succeeded', true, 'pi_test_a9') $$,
  'the payment is succeeded with its payment intent');
select results_eq(
  $$ select status::text from public.rent_charges where id = '00000000-0006-0000-0000-0000000000a9' $$,
  $$ values ('paid') $$,
  'the charge is paid');
select results_eq(
  $$ select count(*)::int from public.audit_log
     where action = 'payment.succeeded' and entity_id = '00000000-0007-0000-0000-0000000000a9' $$,
  $$ values (1) $$,
  'one audit entry, even after the replay');
select results_eq(
  $$ select status::text from public.payments where stripe_session_id = 'cs_test_expired_a9' $$,
  $$ values ('failed') $$,
  'an expired session fails its pending payment');

set local role service_role;
select public.fail_rent_payment('cs_test_pending_a9');
reset role;
select results_eq(
  $$ select status::text from public.payments where stripe_session_id = 'cs_test_pending_a9' $$,
  $$ values ('succeeded') $$,
  'a late expiry does not undo a succeeded payment');

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2'); -- tenant_a1
select results_eq(
  $$ select status::text from public.payments where stripe_session_id = 'cs_test_pending_a9' $$,
  $$ values ('succeeded') $$,
  'the tenant sees their payment');

select * from finish();
rollback;
