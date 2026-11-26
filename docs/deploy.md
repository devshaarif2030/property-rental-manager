# Deploy (free tiers)

How to run the live demo on Supabase Free and Vercel Hobby. You do every step that involves
a key yourself, in the Supabase and Vercel dashboards. Keys never go in the repo or in chat.

Dashboard menu names change from time to time. If one has moved, search the dashboard for
the setting name.

## 1. Supabase project

1. Create a new project at supabase.com (Free plan). Pick a region close to your users and
   save the database password in your password manager.
2. Note the **project ref**. It is the part of the project URL after `/project/`.

## 2. Push the schema

From the repo root on your machine:

```bash
pnpm exec supabase login                          # opens the browser
pnpm exec supabase link --project-ref <project-ref>  # asks for the database password
pnpm exec supabase db push                        # applies supabase/migrations
```

`db push` only applies migrations. It never runs `supabase/seed.sql`, so the local demo
password is not used in production.

Check it worked: in the dashboard, Table Editor should list the 13 tables, each marked as
RLS enabled. Storage should list a private `lease-documents` bucket, and Integrations → Cron should list
two nightly jobs, `generate-rent-charges` and `mark-overdue-rent-charges`. The migrations
create both, and they enable `pg_cron`, which the Free plan includes.

## 3. Supabase Auth settings

In Authentication settings:

| Setting                         | Value                                                |
| ------------------------------- | ---------------------------------------------------- |
| Allow new users to sign up      | Off (accounts come from invites)                     |
| Minimum password length         | 8                                                    |
| Site URL                        | `https://<your-app>.vercel.app`                      |
| Redirect URLs                   | `https://<your-app>.vercel.app/auth/callback`        |
|                                 | `https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deploys) |

The built-in email service on the Free plan sends only a few emails per hour. That is
enough for magic links in a demo.

## 4. First admin account

Invites need an existing admin, so create the first one by hand:

1. Authentication → Users → Add user → Create new user. Enter your email and a strong
   password, and tick auto confirm.
2. Copy the new user's UID.
3. In the SQL Editor, run (replace the two values):

```sql
with org as (
  insert into public.organizations (name) values ('Sample Lettings Ltd') returning id
)
insert into public.profiles (id, org_id, role, full_name)
select '<user-uid>', org.id, 'admin', '<your name>' from org;
```

From then on, invite everyone else from the People page in the app.

## 5. Vercel project

1. vercel.com → Add New → Project → import `property-rental-manager`. Vercel detects
   Next.js and pnpm. Leave the build settings as they are.
2. Before the first deploy, add these environment variables (Settings → Environment
   Variables) for Production and Preview:

| Variable                               | Where to find it (Supabase → Project Settings → API Keys) | Sensitive |
| -------------------------------------- | -------------------------------------------------- | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project URL, `https://<project-ref>.supabase.co`    | No        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key, `sb_publishable_...`               | No        |
| `SUPABASE_SECRET_KEY`                  | Secret key, `sb_secret_...`                         | Yes       |

The secret key bypasses RLS. It is only read in server code (`server-only` imports). Never
prefix it with `NEXT_PUBLIC_`.

3. Deploy. Copy the production URL into the Supabase Site URL and Redirect URLs from step 3
   if it differs from what you guessed.

## 6. Stripe (test mode only)

The app refuses live keys: `STRIPE_SECRET_KEY` must start with `sk_test_` (or `rk_test_`).

1. Create a free Stripe account and keep the dashboard in **test mode** (the toggle at the top).
2. Developers → API keys → copy the **Secret key** (`sk_test_...`).
3. Developers → Webhooks → Add endpoint:
   - URL: `https://<your-app>.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`
4. Open the new endpoint and reveal its **Signing secret** (`whsec_...`).
5. In Vercel, add both for Production and Preview, then redeploy:

| Variable                | Value                       | Sensitive |
| ----------------------- | --------------------------- | --------- |
| `STRIPE_SECRET_KEY`     | Test secret key, `sk_test_` | Yes       |
| `STRIPE_WEBHOOK_SECRET` | Signing secret, `whsec_`    | Yes       |

Locally, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` with the Stripe
CLI and put the `whsec_` it prints in `.env.local`.

## 7. Smoke test

1. Open the live URL. The portfolio banner shows on every page.
2. Open `/manager` signed out. You are sent to sign in.
3. Sign in as the admin from step 4. You land on `/admin`.
4. People → invite a manager to a second email you own, open the link in a private window,
   and accept it. You land on `/manager`.
5. Add a property and a unit.
6. Create a lease for a tenant, upload a sample PDF on the unit page, and open it with
   View lease PDF.
7. The next night a rent charge appears (or run `select private.generate_rent_charges();` in
   the SQL Editor). Sign in as the tenant, press Pay now, and pay with the test card
   `4242 4242 4242 4242`. You land on the receipt and the charge shows as paid.

## 8. One-click demo logins

The "Try as" buttons sign in as shared demo accounts listed in `private.demo_accounts`.
Create a manager, a tenant and a maintenance staff member in the same organization
(invites, as in step 4), then map them in the SQL Editor:

```sql
insert into private.demo_accounts (role, user_id)
select 'manager'::public.user_role, id from auth.users where email = 'manager-demo@example.com'
union all
select 'tenant'::public.user_role, id from auth.users where email = 'tenant-demo@example.com'
union all
select 'staff'::public.user_role, id from auth.users where email = 'staff-demo@example.com';
```

Admin is not allowed. Demo accounts cannot create invites.

Every night at 03:00 UTC `private.reset_demo_data()` deletes the demo organization's
properties, leases, charges, payments, requests and pending invites, and loads the sample
set again, including four sample maintenance requests (one waiting for triage, one
assigned to the demo staff, one in progress, one done). People are kept. The staff
account is optional; without it the sample jobs stay unassigned. Run it by hand with `select private.reset_demo_data();`.

## If sign in does not work

- **"This account has no profile in the app yet"**: the auth user exists but has no row in
  `public.profiles`. Run `select id, email from auth.users;` and `select id, role from
  public.profiles;` in the SQL Editor, then rerun the step 4 query with the exact user id.
- **"Email or password is incorrect"**: reset the password under Authentication → Users, or
  check that the user was created with auto confirm ticked.
- **"Something went wrong"**: open Vercel → the deployment → Logs. A missing or mistyped
  environment variable shows up there. Fix it and redeploy, since variables only apply to
  new deployments.

## Keeping it alive

Free Supabase projects pause after about a week with no activity. Open the demo at least
weekly, or restore the project from the dashboard before sharing the link.

## Later milestones

Gemini (`GEMINI_API_KEY`) and Resend (`RESEND_API_KEY`) are added to Vercel the same way
when those features land.
