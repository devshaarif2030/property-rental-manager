import { Bot, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "./logo";

const HIGHLIGHTS = [
  { icon: CreditCard, text: "Rent paid through Stripe Checkout, confirmed only by a verified webhook." },
  { icon: Bot, text: "Repair requests triaged by Gemini, with keyword rules when the AI is down." },
  { icon: ShieldCheck, text: "Every role sees only its own data, enforced in the database." },
];

/** Two-panel frame for the sign-in and invite pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-4 p-3 sm:p-4 lg:grid-cols-2">
      <main className="flex flex-col rounded-[28px] border border-border/70 bg-card px-6 py-8 shadow-card sm:px-12">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="stagger mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-10">{children}</div>
      </main>
      <aside className="bg-brand-gradient relative hidden overflow-hidden rounded-[28px] p-10 text-white lg:flex lg:flex-col lg:justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-20 size-80 rounded-full bg-brand-400/25 blur-3xl"
        />
        <div className="glass animate-fade-up relative flex flex-col gap-5 rounded-3xl p-7 [--delay:150ms]">
          <p className="text-2xl leading-snug font-bold">Rent, leases and repairs for a small property team.</p>
          <ul className="flex flex-col gap-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex gap-3 text-sm text-brand-100">
                <span aria-hidden className="glass flex size-8 shrink-0 items-center justify-center rounded-full">
                  <item.icon className="size-4 text-white" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
