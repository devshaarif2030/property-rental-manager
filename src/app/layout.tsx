import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { DevCredit } from "@/components/dev-credit";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Property Rental Manager",
  description:
    "Portfolio build: a multi-role property rental system with leases, rent payments in Stripe test mode and maintenance requests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <DevCredit />
      </body>
    </html>
  );
}
