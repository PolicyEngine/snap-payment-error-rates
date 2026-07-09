import type { Metadata } from "next";
import Link from "next/link";
import { DATA } from "@/lib/obbba";

export const metadata: Metadata = {
  title: "Methodology — SNAP payment error rates | PolicyEngine",
  description:
    "Data sources, statutory basis, and statistical methods behind the SNAP payment error rate uncertainty explorer.",
};

const SOURCES: Array<{ label: string; url: string; note: string }> = [
  {
    label: "FNA, SNAP payment error rates (official annual tables)",
    url: "https://www.fna.usda.gov/snap/qc/per",
    note: "FY2017–19 and FY2022–25 state tables; FY2020–21 were not published under COVID QC waivers. FY2025 dated June 24, 2026.",
  },
  {
    label: "7 U.S.C. 2013(a)(2) — quality control incentives",
    url: "https://uscode.house.gov/view.xhtml?req=(title:7%20section:2013)",
    note: "Added by Pub. L. 119-21 §10105 (One Big Beautiful Bill Act): share tiers (B)(i), rate-year election (B)(ii), delayed implementation (B)(iii).",
  },
  {
    label: "FNA National Data Bank, SNAP state benefit summary FY2025",
    url: "https://www.fna.usda.gov/pd/supplemental-nutrition-assistance-program-snap",
    note: "State benefit issuance, P-EBT excluded, data as of June 12, 2026.",
  },
  {
    label: "SNAP QC public-use file, FY2024",
    url: "https://snapqcdata.net/datafiles",
    note: "44,891 completed active-case reviews with recorded error findings; the basis for sampling-error estimates (sha256-pinned in the pipeline).",
  },
  {
    label: "Bauer & Schanzenbach (Brookings), SNAP payment error rates by state, FY2003–25",
    url: "https://www.brookings.edu/articles/snap-payment-error-rates-by-state-fy-2003-24/",
    note: "The confidence-interval and band-probability framing this tool operationalizes follows Diane Whitmore Schanzenbach's analysis of statistical uncertainty in state PERs.",
  },
];

export default function Methodology() {
  return (
    <section className="min-h-screen px-5 pb-16 pt-28 md:px-8 md:pt-32">
      <div className="mx-auto w-full max-w-[860px]">
        <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
          Methodology
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)] md:text-5xl">
          How these numbers are built
        </h1>

        <Prose>
          <h2>What a payment error rate is</h2>
          <p>
            Each year every state agency reviews a stratified random sample of
            its active SNAP cases; federal reviewers re-review a subsample. A
            case&apos;s payment error is the dollar amount by which its benefit
            was over- or under-issued. Errors below a tolerance threshold ($56
            in FY2024, $57 in FY2025, $58 in FY2026) are excluded entirely;
            errors at or above it count in full, over- and underpayments both
            counting positively with no netting. If a reviewed household was
            ineligible, its entire benefit counts as error. Wrongful denials
            are tracked separately and do not enter the payment error rate.
            The published rate is total error dollars over total benefit
            dollars, computed with case weights and a regression adjustment
            for incomplete reviews.
          </p>

          <h2>What OBBBA attaches to it</h2>
          <p>
            Section 10105 of the One Big Beautiful Bill Act (Pub. L. 119-21)
            adds 7 U.S.C. 2013(a)(2): beginning FY2028, a state pays 0% of
            benefit costs if its rate is under 6%, 5% if 6–&lt;8%, 10% if
            8–&lt;10%, and 15% at 10% or above. For FY2028 a state elects its
            FY2025 or FY2026 rate; from FY2029 the rate of the third preceding
            fiscal year applies. If a state&apos;s FY2025 rate × 1.5 is at
            least 20% (rate ≥ 13.33%), its first cost-share year is delayed to
            FY2029; qualifying on the FY2026 rate delays it to FY2030. Seven
            jurisdictions qualify on FY2025 rates:{" "}
            {DATA.national.delayedStatesFY2028.join(", ")}.
          </p>
          <p>
            These tiers are not hand-coded in the app: the provision is encoded
            as a RuleSpec module and compiled by the Axiom Foundation&apos;s
            open-source rules engine, which recomputes every state&apos;s band
            and delay determination in your browser. The test suite executes
            the compiled statute against a dense sweep of rates and all 53
            published assignments.
          </p>

          <h2>Sampling error</h2>
          <p>
            State QC samples run from a few hundred to about a thousand
            completed reviews a year, so the measured rate is an estimate with
            meaningful sampling error. We estimate each state&apos;s standard
            error by case bootstrap (1,000 replicates) of the dollar-weighted
            error ratio on the FY2024 SNAP QC public-use file, applying the
            FY2024 $56 tolerance, then scale each state&apos;s relative
            precision (coefficient of variation) to its official rates. This
            reproduces the roughly one-percentage-point standard errors that
            published analyses imply for large states.
          </p>
          <p>
            Three caveats. The public-use file excludes ineligible-household
            and incomplete reviews, so it understates the variance contributed
            by all-or-nothing ineligibility errors; our standard errors are if
            anything conservative. Its weights are calibrated nationally, not
            per state. And the official regression adjustment isn&apos;t
            replicated — which is why we use the file for relative precision
            rather than point estimates.
          </p>

          <h2>Band probabilities and noise-weighted costs</h2>
          <p>
            Following the framing in Schanzenbach&apos;s analysis: if the
            observed rate were the truth, sampling error alone implies a
            distribution over what a re-measured rate would show. We model the
            measured rate as Normal(observed, SE), truncated at zero, and
            integrate it over the statutory bands — splitting the 15% tier at
            13.33% because draws above it delay billing rather than increase
            it. Dollar figures multiply each band&apos;s share by FY2025
            federal benefit issuance as a scale proxy; FY2028 issuance will
            differ (OBBBA&apos;s eligibility changes are projected to reduce
            it). The &quot;noise-weighted&quot; cost is the
            probability-weighted average across bands; the band-flip risk is
            the chance a re-measured rate lands outside the published
            band.
          </p>

          <h2>Signal versus noise across years</h2>
          <p>
            For each state we compare the standard deviation of its FY2022–25
            published rates to the sampling standard error at its mean rate. A
            ratio near 1 means year-to-year movement is about what sampling
            noise alone would generate; materially above 1 means real change
            (New Jersey&apos;s 14.33% → 6.86% drop, for example, far exceeds
            any sampling story). Persistent level differences between states
            are far larger than sampling error and are not in dispute — the
            uncertainty matters at the cutoffs, not for whether states differ.
          </p>
          <p>
            Larger samples shrink sampling error with the square root of the
            sample size; the explorer&apos;s slider applies that scaling to
            every state simultaneously to show what expanded QC reviews would
            buy in band certainty.
          </p>

          <h2>Sources</h2>
        </Prose>

        <ul className="mt-4 grid gap-3">
          {SOURCES.map((s) => (
            <li
              key={s.url}
              className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <a
                href={s.url}
                className="font-semibold text-[var(--primary)] underline decoration-[var(--color-gray-400)] underline-offset-2 hover:text-[var(--color-teal-700)]"
              >
                {s.label}
              </a>
              <p className="mt-1 text-sm leading-5 text-[var(--color-gray-600)]">
                {s.note}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm leading-6 text-[var(--muted-foreground)]">
          The build pipeline (source tables, pinned QC file, bootstrap, and
          every derived number) is in the repository&apos;s{" "}
          <code className="rounded bg-[var(--color-gray-100)] px-1 py-0.5 font-mono text-[0.9em]">
            data/pipeline.py
          </code>
          . The separate pre-OBBBA QC liability system under 7 CFR
          275.23(d)(2) is computed on the{" "}
          <Link
            href="/qc-liability"
            className="font-semibold text-[var(--primary)] underline decoration-[var(--color-gray-400)] underline-offset-2 hover:text-[var(--color-teal-700)]"
          >
            QC liability page
          </Link>{" "}
          by Axiom&apos;s compiled RuleSpec engine, in your browser.
        </p>
      </div>
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose-headings:font-semibold mt-6 grid gap-3 text-base leading-7 text-[var(--color-gray-600)] [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:tracking-[-0.01em] [&_h2]:text-[var(--foreground)]">
      {children}
    </div>
  );
}
