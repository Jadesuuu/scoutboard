import type { Metadata } from "next";
import { Libre_Franklin } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./provider";
import Navbar from "@/components/layout/navbar";
import DemoBanner from "@/components/layout/demo-banner";
import SiteFooter from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";

/**
 * One typeface for the whole page. The design gets its hierarchy from weight
 * (400 through 900) and tight tracking, so rather than pulling six static
 * weights we take the variable font — one file that covers the whole range.
 */
const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScoutBoard — buy a real business with real numbers",
  description:
    "A marketplace for independent main-street businesses, with the books open and every offer in view.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        libreFranklin.variable,
        "font-sans",
      )}
    >
      <body className="bg-paper text-ink flex min-h-full flex-col text-[15px]">
        <Navbar />
        <DemoBanner />
        <Providers>
          <main className="flex-1">{children}</main>
        </Providers>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
