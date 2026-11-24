# Property Rental Manager

> **Portfolio build.** Fictional client, sample data, Stripe test mode. Not a real product.

A multi-role property rental system: leases, monthly rent with Stripe Checkout (test mode),
and maintenance requests with AI triage. Next.js + TypeScript + Supabase.

[![CI](https://github.com/devshaarif2030/property-rental-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/devshaarif2030/property-rental-manager/actions/workflows/ci.yml)

Work in progress (week 1 of 4). The full README with demo, GIFs and diagrams lands in week 4.

## Roles

| Role    | Sees                                                                   |
| ------- | ---------------------------------------------------------------------- |
| admin   | Everything in their organization, including the audit log              |
| manager | Properties, units, leases, rent, payments and requests in their org    |
| tenant  | Their own lease, charges, payments and requests                        |
| staff   | Maintenance jobs assigned to them, and nothing financial               |

Access is enforced in Postgres with Row Level Security. Every business table has `org_id`,
and `supabase/tests/database` holds pgTAP tests that prove each role sees only its own rows.

## Run locally

Requires Node 22, pnpm and Docker.

```bash
pnpm install
cp .env.example .env.local   # fill in values from `supabase status`
pnpm db:start                # local Supabase, applies migrations
pnpm db:test                 # RLS tests
pnpm dev
```

The local seed creates one fictional organization with a demo account per role:
`admin@demo.test`, `manager@demo.test`, `tenant@demo.test`, `staff@demo.test`, all with the
local-only password `demo-password`. Magic link emails land in Mailpit at http://127.0.0.1:54324.

## Checks

| Command          | What it does                         |
| ---------------- | ------------------------------------ |
| `pnpm lint`      | ESLint                               |
| `pnpm typecheck` | TypeScript strict                    |
| `pnpm test`      | Vitest unit tests                    |
| `pnpm test:integration` | Sign-in tests against local Supabase |
| `pnpm db:lint`   | Lints database functions             |
| `pnpm db:test`   | pgTAP RLS tests against local Postgres |

CI runs all of these on every pull request.

## Security notes

- RLS on every table. `anon` has no table access.
- Sign up is closed: accounts are created by invite only. Roles come from the `profiles` table,
  never from the JWT, and every protected page re-checks the role on the server.
- Clients cannot write rent charges, payments, notifications or the audit log. Payments are
  recorded only by the verified Stripe webhook using the service role.
- The audit log is insert-only, enforced by a trigger.
- No secrets in the repo. `.env.example` holds placeholders only.

---

Portfolio build by Muhammad Shaarif, [devshaarif.com](https://devshaarif.com).
