import type { Metadata } from "next";
import Link from "next/link";
import { SnapPerCalculator } from "@/components/SnapPerCalculator";

export const metadata: Metadata = {
  title: "SNAP QC liability calculator (7 CFR 275.23(d)(2)) | PolicyEngine",
  description:
    "Compute SNAP quality-control liabilities under 7 CFR 275.23(d)(2), executed in your browser by Axiom's compiled RuleSpec engine.",
};

export default function QcLiability() {
  return (
    <>
      <div className="px-5 pt-28 md:px-8 md:pt-32">
        <div className="mx-auto w-full max-w-[1280px] rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-sm leading-6 text-[var(--color-gray-600)]">
          This page computes the <em>pre-OBBBA</em> quality-control liability
          system — 7 CFR 275.23(d)(2), which remains in force — where liability
          attaches after consecutive years above 105% of the national
          performance measure. The new OBBBA cost share (0–15% of benefits from
          FY2028) is a separate regime:{" "}
          <Link
            href="/"
            className="font-semibold text-[var(--primary)] underline decoration-[var(--color-gray-400)] underline-offset-2 hover:text-[var(--color-teal-700)]"
          >
            explore it with real state data and sampling uncertainty
          </Link>
          .
        </div>
      </div>
      <div className="[&>section]:pt-10 md:[&>section]:pt-10 [&>section]:min-h-0">
        <SnapPerCalculator />
      </div>
    </>
  );
}
