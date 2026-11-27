import {
  Bell,
  Bot,
  Building2,
  CreditCard,
  FileText,
  FolderGit2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { DemoLoginButtons } from "@/components/demo-login-buttons";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/paths";

const REPOSITORY_URL = "https://github.com/devshaarif2030/property-rental-manager";

type Feature = { icon: LucideIcon; role: string; title: string; points: string[] };

const FEATURES: Feature[] = [
  {
    icon: Building2,
    role: "Property manager",
    title: "Run the portfolio",
    points: [
      "Properties, units and leases with signed PDFs",
      "Monthly rent charges and overdue tracking",
      "Triage queue with AI suggestions to confirm",
    ],
  },
  {
    icon: UserRound,
    role: "Tenant",
    title: "Pay and report",
    points: [
      "Lease, rent due and payment history in one view",
      "Pay with Stripe Checkout (test mode)",
      "Report a repair with photos and follow it",
    ],
  },
  {
    icon: Wrench,
    role: "Maintenance staff",
    title: "Work the job list",
    points: [
      "Only the jobs assigned to you",
      "Move a job to in progress or done",
      "Leave notes the tenant can read",
    ],
  },
  {
    icon: ShieldCheck,
    role: "Admin",
    title: "Keep it safe",
    points: [
      "Invite-only accounts per role",
      "Row level security on every table",
      "Audit log of sensitive changes",
    ],
  },
];

const TRIAGE_STEPS = [
  { icon: FileText, title: "Tenant reports", text: "A title, a description and up to three photos." },
  {
    icon: Bot,
    title: "Gemini suggests",
    text: "Category and priority, checked against a strict schema. If the AI is down, keyword rules step in.",
  },
  { icon: KeyRound, title: "Manager decides", text: "The suggestion is only a starting point. A person confirms it." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-2 sm:gap-6">
          <a href="#features" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">
            Features
          </a>
          <a href="#ai-triage" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block">
            AI triage
          </a>
          <Button asChild variant="dark">
            <Link href={SIGN_IN_PATH}>Sign in</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 pb-16 sm:px-6">
        <section className="bg-brand-gradient animate-fade-up relative overflow-hidden rounded-2xl px-4 py-10 text-white sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-400/25 blur-3xl"
          />
          <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div className="stagger flex min-w-0 flex-col gap-6">
              <span className="glass inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
                <Sparkles className="size-3.5" aria-hidden />
                Portfolio build for a fictional property company
              </span>
              <h1 className="text-4xl leading-[1.05] font-semibold sm:text-6xl">
                Rent, leases and repairs in one calm place.
              </h1>
              <p className="max-w-xl text-base text-brand-100 sm:text-lg">
                A multi-role system for a small property management team. Managers, tenants and maintenance
                staff each get their own view of the same data, and only their part of it.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-brand-100">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5" aria-hidden /> Stripe test mode
                </span>
                <span className="flex items-center gap-1.5">
                  <Bot className="size-3.5" aria-hidden /> Gemini triage with a fallback
                </span>
                <span className="flex items-center gap-1.5">
                  <Bell className="size-3.5" aria-hidden /> In-app and email alerts
                </span>
              </div>
            </div>

            <div className="glass animate-fade-up flex min-w-0 flex-col gap-5 rounded-2xl p-4 sm:p-7 [--delay:250ms]">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-semibold">Try the live demo</h2>
                <p className="text-sm text-brand-100">
                  One click signs you in to a shared demo account. No sign up. Sample data resets every night.
                </p>
              </div>
              <DemoLoginButtons variant="glass" />
              <p className="border-t border-white/15 pt-4 text-xs text-brand-100">
                Paying rent? Use the Stripe test card 4242 4242 4242 4242 with any future date and any CVC.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="flex scroll-mt-8 flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Features by role</p>
            <h2 className="text-3xl font-semibold sm:text-4xl">One system, four points of view</h2>
          </div>
          <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <li
                key={feature.role}
                className="hover-lift flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-card"
              >
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-xl bg-accent text-brand-800"
                >
                  <feature.icon className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-muted-foreground">{feature.role}</p>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {feature.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="ai-triage"
          className="grid scroll-mt-8 gap-8 rounded-2xl border border-border/70 bg-card p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_1.4fr]"
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">AI triage</p>
            <h2 className="text-3xl font-semibold">AI helps. A person decides.</h2>
            <p className="text-muted-foreground">
              Every repair request gets a suggested category and priority. The app keeps working when the AI does
              not, and nothing is acted on until the manager confirms.
            </p>
          </div>
          <ol className="stagger grid gap-4 sm:grid-cols-3">
            {TRIAGE_STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-3 rounded-2xl bg-background p-5">
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden
                    className="flex size-10 items-center justify-center rounded-full bg-brand-gradient text-white"
                  >
                    <step.icon className="size-[18px]" />
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Portfolio build by{" "}
            <a href="https://devshaarif.com" className="font-medium text-foreground underline-offset-4 hover:underline">
              Muhammad Shaarif
            </a>
            . Fictional client, sample data, Stripe test mode.
          </p>
          <a
            href={REPOSITORY_URL}
            className="flex items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline"
          >
            <FolderGit2 className="size-4" aria-hidden />
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
