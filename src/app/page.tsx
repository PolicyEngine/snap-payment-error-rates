import Link from "next/link";
import { ErrorRateExplorer } from "@/components/ErrorRateExplorer";
import { DATA, money } from "@/lib/obbba";

export default function Home() {
  const national = DATA.national;
  const ny = DATA.states.find((s) => s.abbrev === "NY")!;
  return (
    <section className="min-h-screen px-5 pb-12 pt-28 md:px-8 md:pt-32">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        <div className="grid gap-8 border-b border-[var(--border)] pb-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)] lg:items-end">
          <div>
            <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
              SNAP quality control · FY2025 rates published June 24, 2026
            </p>
            <h1 className="max-w-[760px] text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--foreground)] md:text-6xl">
              SNAP error rates now carry a price. How much of the bill is
              statistical noise?
            </h1>
          </div>
          <div className="max-w-[660px] text-base leading-7 text-[var(--color-gray-600)] md:text-lg">
            <p>
              Starting FY2028, states pay 0–15% of SNAP benefit costs based on
              their measured payment error rate (
              <code className="rounded bg-[var(--color-gray-100)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--foreground)]">
                7 U.S.C. 2013(a)(2)
              </code>
              , added by OBBBA §10105). But each state&apos;s rate comes from a
              quality-control review of a few hundred to a thousand cases — a
              sample, with sampling error. Near a 6%, 8%, 10%, or 13.33%
              cutoff, the difference between bands — often nine figures — can
              come down to the draw.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat
            label="National FY2025 error rate"
            value={`${national.fy2025.per.toFixed(2)}%`}
            detail={`${national.fy2025.over.toFixed(2)}% overpayments + ${national.fy2025.under.toFixed(2)}% underpayments; tolerance threshold $57`}
          />
          <Stat
            label="FY2028 state bill at published rates"
            value={money(national.totalPointCostFY2028)}
            detail={`Statutory shares × FY2025 issuance of ${money(national.issuanceFY2025)}; ${national.delayedStatesFY2028.length} jurisdictions delayed to FY2029`}
          />
          <Stat
            label="Noise-weighted expectation"
            value={money(national.totalExpectedCostFY2028)}
            detail="Probability-weighted across bands a re-measured rate could land in"
          />
          <Stat
            label="New York's band-flip risk"
            value={`${Math.round(ny.flipProb * 100)}%`}
            detail={`Measured ${ny.fy2025.per.toFixed(2)}%, just ${(20 / 1.5 - ny.fy2025.per).toFixed(2)}ppt below the 13.33% delay line`}
          />
        </div>

        <ErrorRateExplorer />

        <div className="grid gap-6 border-t border-[var(--border)] pt-8 md:grid-cols-3">
          <article>
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
              Persistent differences are real
            </h2>
            <p className="text-sm leading-6 text-[var(--color-gray-600)]">
              States differ durably — South Dakota has measured under 4% for
              years while several states sit persistently above 10%. That
              between-state signal is much larger than sampling error. The
              noise problem is different: a single year&apos;s draw decides
              which side of a sharp cutoff a state lands on.
            </p>
          </article>
          <article>
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
              Year-to-year movement ≈ noise
            </h2>
            <p className="text-sm leading-6 text-[var(--color-gray-600)]">
              For most states, FY2022–25 rate swings are about the size
              sampling error predicts (ratio ≈ 1) — apparent
              &quot;improvement&quot; or &quot;deterioration&quot; between
              adjacent years usually isn&apos;t evidence of either. Outliers
              like New Jersey (14.33% → 6.86%) moved far more than noise
              allows: real administrative change.
            </p>
          </article>
          <article>
            <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
              Bigger samples would firm it up
            </h2>
            <p className="text-sm leading-6 text-[var(--color-gray-600)]">
              Sampling error shrinks with √n: quadrupling review samples halves
              it. Use the slider above to see how much of each state&apos;s
              band uncertainty a larger QC sample would remove — and what it
              does to the noise-weighted bill.
            </p>
          </article>
        </div>

        <footer className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-sm leading-6 text-[var(--color-gray-600)]">
          <p>
            Official FNS/FNA payment error rates (FY2017–19, FY2022–25),
            FY2025 state benefit issuance, and sampling errors bootstrapped
            from the FY2024 SNAP QC public-use file —{" "}
            <Link
              href="/methodology"
              className="font-semibold text-[var(--primary)] underline decoration-[var(--color-gray-400)] underline-offset-2 hover:text-[var(--color-teal-700)]"
            >
              full methodology and sources
            </Link>
            . The pre-OBBBA quality-control liability system (7 CFR
            275.23(d)(2)) remains in force;{" "}
            <Link
              href="/qc-liability"
              className="font-semibold text-[var(--primary)] underline decoration-[var(--color-gray-400)] underline-offset-2 hover:text-[var(--color-teal-700)]"
            >
              compute those liabilities here
            </Link>
            , executed by Axiom&apos;s compiled RuleSpec in your browser.
          </p>
        </footer>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_18px_48px_rgba(16,24,40,0.06)]">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-5 text-[var(--color-gray-600)]">
        {detail}
      </p>
    </article>
  );
}
