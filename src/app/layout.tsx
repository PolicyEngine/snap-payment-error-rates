import type { Metadata } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { JetBrains_Mono, Newsreader } from "next/font/google";
import { Footer, GradientSync, Nav } from "@axiom-foundation/ui";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://snap-per-penalty-tool.vercel.app"),
  title: "SNAP payment error rates and the OBBBA state cost share — Axiom Foundation",
  description:
    "FY2025 SNAP payment error rates for all 53 state agencies, the 0–15% OBBBA cost share they trigger, and how much of each state's band assignment is statistical noise.",
  openGraph: {
    type: "website",
    siteName: "Axiom Foundation",
    url: "/",
    title: "SNAP error rates now carry a price. How much is noise?",
    description:
      "FY2025 payment error rates, the OBBBA 0–15% state cost share, and the sampling error that decides nine-figure band assignments.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SNAP error rates now carry a price. How much is noise?",
    description:
      "FY2025 payment error rates, the OBBBA 0–15% state cost share, and the sampling error that decides nine-figure band assignments.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${mono.variable} ${serif.variable}`}
    >
      <body>
        <GradientSync />
        <Nav
          baseUrl="https://axiom-foundation.org"
          logoSrc="/logos/axiom-foundation.svg"
        />
        <main className="relative z-10">{children}</main>
        <Footer
          renderLink={Link}
          baseUrl="https://axiom-foundation.org"
          logoSrc="/logos/axiom-foundation.svg"
        />
      </body>
    </html>
  );
}
