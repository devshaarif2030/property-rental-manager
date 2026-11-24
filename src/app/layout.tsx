import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PortfolioBanner } from "@/components/portfolio-banner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Property Rental Manager",
  description:
    "Portfolio build: a multi-role property rental system with leases, rent payments in Stripe test mode and maintenance requests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <PortfolioBanner />
        {children}
      </body>
    </html>
  );
}
