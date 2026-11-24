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

## 6. Smoke test

1. Open the live URL. The portfolio banner shows on every page.
2. Open `/manager` signed out. You are sent to sign in.
3. Sign in as the admin from step 4. You land on `/admin`.
4. People → invite a manager to a second email you own, open the link in a private window,
   and accept it. You land on `/manager`.
5. Add a property and a unit.
6. Create a lease for a tenant, upload a sample PDF on the unit page, and open it with
   View lease PDF.

## Keeping it alive

Free Supabase projects pause after about a week with no activity. Open the demo at least
weekly, or restore the project from the dashboard before sharing the link.

## Later milestones

Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`), Gemini (`GEMINI_API_KEY`) and Resend
(`RESEND_API_KEY`) are added to Vercel the same way when those features land.
