import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://snap-per-penalty-tool.vercel.app"),
  title: "SNAP payment error rates and the state cost share | PolicyEngine",
  description:
    "FY2025 SNAP payment error rates for all 53 state agencies, the 0–15% cost share they trigger under OBBBA, and how much of each state's band assignment is statistical noise.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "PolicyEngine",
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

const NAV_LINKS = [
  { href: "/", label: "Explorer" },
  { href: "/methodology", label: "Methodology" },
  { href: "/qc-liability", label: "QC liability" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex h-header w-full max-w-[1280px] items-center justify-between gap-4 px-5 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <a
                href="https://policyengine.org"
                className="flex shrink-0 items-center"
                aria-label="PolicyEngine"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/policyengine.svg"
                  alt="PolicyEngine"
                  className="h-6 w-auto"
                />
              </a>
              <span className="hidden truncate border-l border-border pl-3 text-sm text-gray-600 sm:block">
                SNAP payment error rates
              </span>
            </div>
            <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://github.com/PolicyEngine/snap-payment-error-rates"
                aria-label="Source on GitHub"
                className="transition-colors hover:text-primary"
              >
                <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
              </a>
            </nav>
          </div>
        </header>
        <main className="relative">{children}</main>
        <footer className="border-t border-border bg-gray-100/60">
          <div className="mx-auto grid w-full max-w-[1280px] gap-3 px-5 py-8 text-sm leading-6 text-gray-600 md:px-8">
            <p>
              Built by{" "}
              <a
                href="https://policyengine.org"
                className="font-medium text-primary hover:text-teal-700"
              >
                PolicyEngine
              </a>
              , a nonprofit that provides free, open-source software to compute
              the impact of public policy.
            </p>
            <p>
              Statutory formulas on this site are encoded in RuleSpec and
              executed in your browser by the{" "}
              <a
                href="https://axiom-foundation.org"
                className="font-medium text-primary hover:text-teal-700"
              >
                Axiom Foundation
              </a>
              &apos;s open-source rules engine — no calculation API is called.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
