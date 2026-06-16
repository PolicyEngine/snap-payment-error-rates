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
  title: "SNAP payment error rate liability calculator — Axiom Foundation",
  description:
    "Compute SNAP payment error rate liabilities under 7 CFR 275.23(d)(2). Inputs run against Axiom's compiled RuleSpec in your browser — no calculation API is called.",
  openGraph: {
    type: "website",
    siteName: "Axiom Foundation",
    url: "/",
    title: "SNAP payment error rate liability calculator",
    description:
      "Compute SNAP payment error rate liabilities under 7 CFR 275.23(d)(2), executed in your browser by Axiom's compiled RuleSpec engine.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SNAP payment error rate liability calculator",
    description:
      "Compute SNAP payment error rate liabilities under 7 CFR 275.23(d)(2), executed in your browser by Axiom's compiled RuleSpec engine.",
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
