"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BANDS,
  bandFor,
  bandProbabilities,
  DATA,
  DELAY_THRESHOLD,
  expectedCostFY2028,
  money,
  normalPdf,
  pct,
  shareFor,
  type BandKey,
  type StateRecord,
} from "@/lib/obbba";
import { loadCostShareRuntime } from "@/lib/costShareAxiom";

/* Sequential single-hue ramp from --chart-1 (PE teal): fractions chosen for
 * monotonic lightness and the widest adjacent-step CVD separation the hue
 * supports; segment gaps, borders, and labels carry the rest. */
const RAMP: Record<BandKey, string> = {
  lt6: "color-mix(in oklab, var(--chart-1) 12%, var(--background))",
  b6to8: "color-mix(in oklab, var(--chart-1) 42%, var(--background))",
  b8to10: "color-mix(in oklab, var(--chart-1) 72%, var(--background))",
  b10to13_33: "var(--chart-1)",
  gte13_33:
    "repeating-linear-gradient(45deg, var(--muted-foreground) 0 3px, var(--background) 3px 6px)",
};
const RAMP_SOLID: Record<BandKey, string> = {
  ...RAMP,
  gte13_33: "var(--muted-foreground)",
};

const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

type SortKey = "expected" | "point" | "per" | "flip" | "name";

type Row = {
  s: StateRecord;
  se: number;
  probs: Record<BandKey, number>;
  point: number;
  expected: number;
  flip: number;
};

export function ErrorRateExplorer() {
  const [sampleK, setSampleK] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("expected");
  const [expanded, setExpanded] = useState<string | null>("NY");

  const rows = useMemo<Row[]>(() => {
    const list = DATA.states.map((s) => {
      const se = s.sePpt / Math.sqrt(sampleK);
      const probs = bandProbabilities(s.fy2025.per, se);
      const point = s.delayedFY2028
        ? 0
        : shareFor(s.fy2025.per) * s.issuanceFY2025;
      const expected = expectedCostFY2028(s.fy2025.per, se, s.issuanceFY2025);
      const flip = 1 - probs[bandFor(s.fy2025.per).key];
      return { s, se, probs, point, expected, flip };
    });
    const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
      expected: (a, b) => b.expected - a.expected,
      point: (a, b) => b.point - a.point,
      per: (a, b) => b.s.fy2025.per - a.s.fy2025.per,
      flip: (a, b) => b.flip - a.flip,
      name: (a, b) => a.s.name.localeCompare(b.s.name),
    };
    return list.sort(cmp[sortKey]);
  }, [sampleK, sortKey]);

  return (
    <div className="grid gap-6">
      <Controls
        sampleK={sampleK}
        setSampleK={setSampleK}
        sortKey={sortKey}
        setSortKey={setSortKey}
      />
      <BandLegend />
      <EngineVerification />
      <div className="overflow-x-auto rounded-[6px] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              <Th>State agency</Th>
              <Th>
                FY25 rate
                <span className="block normal-case tracking-normal">±95% CI</span>
              </Th>
              <Th>FY17–25</Th>
              <Th>Band</Th>
              <Th>Where a re-measured rate lands</Th>
              <Th className="text-right">FY28 cost</Th>
              <Th className="text-right">Noise-weighted</Th>
              <Th className="text-right">Band-flip risk</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <StateRows
                key={row.s.abbrev}
                row={row}
                sampleK={sampleK}
                expanded={expanded === row.s.abbrev}
                onToggle={() =>
                  setExpanded(expanded === row.s.abbrev ? null : row.s.abbrev)
                }
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
        Dollar figures apply the statutory share to FY2025 federal benefit
        issuance ({money(DATA.national.issuanceFY2025)} nationally) as a scale
        proxy for FY2028; actual FY2028 issuance will differ. States may elect
        their FY2025 or FY2026 rate for FY2028 — FY2026 rates publish in June
        2027, so every figure here uses FY2025, the only election-eligible year
        published so far.
      </p>
    </div>
  );
}

function Controls({
  sampleK,
  setSampleK,
  sortKey,
  setSortKey,
}: {
  sampleK: number;
  setSampleK: (k: number) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
}) {
  return (
    <div className="grid gap-5 rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-5 md:grid-cols-[minmax(0,1fr)_240px]">
      <div>
        <label
          htmlFor="sample-k"
          className="mb-1 flex items-baseline justify-between gap-3 text-sm font-semibold text-[var(--foreground)]"
        >
          What if QC samples were bigger?
          <span className="font-mono text-[0.72rem] font-normal uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {sampleK.toFixed(2).replace(/\.?0+$/, "")}× current sample
          </span>
        </label>
        <input
          id="sample-k"
          type="range"
          min={0.5}
          max={4}
          step={0.25}
          value={sampleK}
          onChange={(e) => setSampleK(Number(e.currentTarget.value))}
          className="w-full accent-[var(--primary)]"
        />
        <p className="mt-1 text-sm leading-5 text-[var(--color-gray-600)]">
          States review ~300–1,000 cases a year; sampling error shrinks with
          √n. Drag to see how larger reviews would firm up band assignments —
          probabilities and noise-weighted costs update live.
        </p>
      </div>
      <div>
        <label
          htmlFor="sort-key"
          className="mb-1 block text-sm font-semibold text-[var(--foreground)]"
        >
          Sort by
        </label>
        <select
          id="sort-key"
          value={sortKey}
          onChange={(e) => setSortKey(e.currentTarget.value as SortKey)}
          className="h-10 w-full rounded-[4px] border border-[var(--color-gray-400)] bg-[var(--background)] px-2 font-mono text-sm text-[var(--foreground)]"
        >
          <option value="expected">Noise-weighted FY2028 cost</option>
          <option value="point">FY2028 cost at published rate</option>
          <option value="per">FY2025 error rate</option>
          <option value="flip">Band-flip risk</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
  );
}

type EngineState =
  | { kind: "loading" }
  | { kind: "verified"; engineVersion: string }
  | { kind: "mismatch"; states: string[] }
  | { kind: "unavailable" };

/** Recompute every state's statutory share and delay determination from the
 * RuleSpec encoding of 7 U.S.C. 2013(a)(2), in this browser, and check them
 * against the published assignments shown in the table. */
function EngineVerification() {
  const [state, setState] = useState<EngineState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadCostShareRuntime()
      .then((runtime) => {
        if (cancelled) return;
        const mismatched = DATA.states
          .filter((s) => {
            const result = runtime.run(s.fy2025.per, s.issuanceFY2025);
            return (
              Math.abs(result.shareRate - s.share) > 1e-9 ||
              result.delayed !== s.delayedFY2028
            );
          })
          .map((s) => s.abbrev);
        setState(
          mismatched.length
            ? { kind: "mismatch", states: mismatched }
            : { kind: "verified", engineVersion: runtime.engineVersion },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "unavailable") return null;

  return (
    <p
      className={`font-mono text-xs leading-5 ${
        state.kind === "mismatch"
          ? "text-[var(--text-error)]"
          : "text-[var(--muted-foreground)]"
      }`}
      aria-live="polite"
    >
      {state.kind === "loading" &&
        "Recomputing statutory assignments from the RuleSpec encoding of 7 U.S.C. 2013(a)(2) in your browser…"}
      {state.kind === "verified" && (
        <>
          ✓ All 53 band and delay assignments recomputed in this browser by the
          Axiom rules engine v{state.engineVersion} from the{" "}
          <a
            href="https://github.com/PolicyEngine/snap-payment-error-rates/blob/main/public/rulespec/us/statutes/7/2013/a/2.yaml"
            className="underline decoration-[var(--color-gray-400)] underline-offset-2 hover:text-[var(--primary)]"
          >
            RuleSpec encoding
          </a>{" "}
          of 7 U.S.C. 2013(a)(2) — no calculation API called.
        </>
      )}
      {state.kind === "mismatch" &&
        `Engine disagreement for: ${state.states.join(", ")} — treat table assignments as unverified.`}
    </p>
  );
}

function BandLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-gray-600)]">
      <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
        State share of benefits
      </span>
      {BANDS.map((b) => (
        <span key={b.key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-[2px] border border-[var(--border)]"
            style={{ background: RAMP[b.key] }}
          />
          {b.label} → {b.delayed ? "delayed" : pct(b.share)}
        </span>
      ))}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-3 py-2.5 font-medium ${className}`}>{children}</th>;
}

function StateRows({
  row,
  sampleK,
  expanded,
  onToggle,
}: {
  row: Row;
  sampleK: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { s, se, probs, point, expected, flip } = row;
  const band = bandFor(s.fy2025.per);
  const ci: [number, number] = [
    Math.max(0, s.fy2025.per - 1.96 * se),
    s.fy2025.per + 1.96 * se,
  ];
  return (
    <>
      <tr
        className={`cursor-pointer border-b border-[var(--color-gray-100)] transition-colors hover:bg-[var(--color-teal-50)] ${
          expanded ? "bg-[var(--color-teal-50)]" : ""
        }`}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">
          {s.name}
          {s.delayedFY2028 && (
            <span className="ml-2 rounded-full border border-[var(--color-gray-400)] px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              delayed
            </span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <span className="font-mono text-[var(--foreground)]">
            {s.fy2025.per.toFixed(2)}%
          </span>
          <span className="block font-mono text-xs text-[var(--muted-foreground)]">
            {ci[0].toFixed(1)}–{ci[1].toFixed(1)}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <Sparkline series={s.series} />
        </td>
        <td className="px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs text-[var(--color-gray-600)]">
            <span
              className="inline-block h-3 w-3 rounded-[2px] border border-[var(--border)]"
              style={{ background: RAMP[band.key] }}
            />
            {band.label}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <StackedBar probs={probs} />
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-[var(--foreground)]">
          {money(point)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-[var(--foreground)]">
          {money(expected)}
        </td>
        <td className="px-3 py-2.5 text-right font-mono">
          <span
            className={
              flip >= 0.3
                ? "text-[var(--text-error)]"
                : flip >= 0.15
                  ? "text-[var(--primary)]"
                  : "text-[var(--color-gray-600)]"
            }
          >
            {pct(flip)}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-[var(--border)]">
          <td colSpan={8} className="bg-[var(--background)] px-3 py-4 md:px-5">
            <Detail row={row} se={se} sampleK={sampleK} />
          </td>
        </tr>
      )}
    </>
  );
}

function Sparkline({ series }: { series: Record<string, number | null> }) {
  const w = 116;
  const h = 30;
  const values = YEARS.map((y) => series[String(y)] ?? null);
  const max = Math.max(10, ...values.filter((v): v is number => v !== null));
  const x = (i: number) => 4 + (i * (w - 8)) / (YEARS.length - 1);
  const y = (v: number) => h - 3 - (v / max) * (h - 6);
  const segments: string[] = [];
  let path = "";
  values.forEach((v, i) => {
    if (v === null) {
      if (path) segments.push(path);
      path = "";
      return;
    }
    path += `${path ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (path) segments.push(path);
  const last = values[values.length - 1];
  return (
    <svg
      width={w}
      height={h}
      role="img"
      aria-label="Payment error rate, FY2017 to FY2025"
      className="block"
    >
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={1.75}
          strokeLinecap="round"
        />
      ))}
      {last !== null && <circle cx={x(YEARS.length - 1)} cy={y(last)} r={2.5} fill="var(--color-teal-700)" />}
    </svg>
  );
}

function StackedBar({ probs }: { probs: Record<BandKey, number> }) {
  return (
    <div
      className="flex h-4 w-full min-w-[160px] overflow-hidden rounded-[3px] border border-[var(--border)]"
      role="img"
      aria-label={BANDS.map((b) => `${b.label}: ${pct(probs[b.key])}`).join(", ")}
    >
      {BANDS.filter((b) => probs[b.key] >= 0.005).map((b) => (
        <span
          key={b.key}
          title={`${b.label} (${b.delayed ? "delayed" : `${pct(b.share)} share`}): ${pct(probs[b.key])} chance`}
          className="h-full border-r border-[var(--card)] last:border-r-0"
          style={{ width: `${probs[b.key] * 100}%`, background: RAMP[b.key] }}
        />
      ))}
    </div>
  );
}

function Detail({ row, se, sampleK }: { row: Row; se: number; sampleK: number }) {
  const { s, probs } = row;
  const per = s.fy2025.per;
  const noiseRatio = s.yoy.noiseRatio;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Sampling distribution at {sampleK}× sample — {s.name}
        </p>
        <DensityChart per={per} se={se} xMax={detailXMax(s)} />
        <p className="mt-2 text-sm leading-6 text-[var(--color-gray-600)]">
          Measured rate {per.toFixed(2)}% from a review of {s.qc.n.toLocaleString()}{" "}
          cases (FY2024 sample; SE ≈ {se.toFixed(2)}ppt
          {sampleK !== 1 ? ` at ${sampleK}× the sample` : ""}).{" "}
          {s.delayedFY2028
            ? "Published rate ≥13.33%: the first cost-share year is delayed to FY2029, so FY2028 billing is $0 regardless of noise."
            : noiseRatio !== null && noiseRatio <= 1.5
              ? `Its FY2022–25 year-to-year swing (SD ${s.yoy.sdRecent}ppt) is ${noiseRatio}× what sampling noise alone predicts — measured movement is mostly noise.`
              : noiseRatio !== null
                ? `Its FY2022–25 swing (SD ${s.yoy.sdRecent}ppt) is ${noiseRatio}× sampling noise — more movement than noise explains, consistent with real administrative change.`
                : ""}
        </p>
      </div>
      <div>
        <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          FY2028 outcome by band — FY2025 issuance {money(s.issuanceFY2025)}
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              <th className="py-1.5 pr-2">Band</th>
              <th className="py-1.5 pr-2">Share</th>
              <th className="py-1.5 pr-2 text-right">Chance</th>
              <th className="py-1.5 text-right">Annual cost</th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b) => {
              const cost = b.delayed ? 0 : b.share * s.issuanceFY2025;
              const current = bandFor(per).key === b.key;
              return (
                <tr
                  key={b.key}
                  className={`border-b border-[var(--color-gray-100)] ${
                    current ? "bg-[var(--color-teal-50)]" : ""
                  }`}
                >
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--foreground)]">
                      <span
                        className="inline-block h-3 w-3 rounded-[2px] border border-[var(--border)]"
                        style={{ background: RAMP[b.key] }}
                      />
                      {b.label}
                      {current ? " ← measured" : ""}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-xs text-[var(--color-gray-600)]">
                    {b.delayed ? "delayed" : pct(b.share)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-[var(--foreground)]">
                    {probs[b.key] < 0.005 && probs[b.key] > 0
                      ? "<1%"
                      : pct(probs[b.key])}
                  </td>
                  <td className="py-1.5 text-right font-mono text-[var(--foreground)]">
                    {b.delayed ? "$0 in FY28" : money(cost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-sm leading-6 text-[var(--color-gray-600)]">
          Noise-weighted FY2028 cost:{" "}
          <span className="font-mono font-semibold text-[var(--foreground)]">
            {money(row.expected)}
          </span>{" "}
          vs {money(row.point)} at the published rate.
        </p>
      </div>
    </div>
  );
}

/** Fixed x-range per state across the sample-size slider: sized to the widest
 * curve it will show (0.5× sample), so dragging the slider visibly tightens
 * the distribution against a constant axis instead of rescaling it. */
function detailXMax(s: StateRecord): number {
  return Math.max(
    16,
    s.fy2025.per + 4 * (s.sePpt * Math.SQRT2),
    DELAY_THRESHOLD + 1.5,
  );
}

function DensityChart({
  per,
  se,
  xMax,
}: {
  per: number;
  se: number;
  xMax: number;
}) {
  const width = 560;
  const height = 170;
  const pad = { left: 10, right: 10, top: 12, bottom: 26 };
  const x = (v: number) =>
    pad.left + (v / xMax) * (width - pad.left - pad.right);
  const yMaxPdf = normalPdf(per, per, se);
  const y = (p: number) =>
    height - pad.bottom - (p / yMaxPdf) * (height - pad.top - pad.bottom);
  const steps = 160;
  const curve = Array.from({ length: steps + 1 }, (_, i) => {
    const v = (xMax * i) / steps;
    return `${i === 0 ? "M" : "L"}${x(v).toFixed(1)},${y(normalPdf(v, per, se)).toFixed(1)}`;
  }).join(" ");
  const baseline = height - pad.bottom;
  const ticks = [0, 6, 8, 10, DELAY_THRESHOLD, Math.round(xMax)];
  return (
    <div className="max-w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Sampling distribution of the measured payment error rate around ${per.toFixed(2)}%`}
        className="h-[170px] w-full min-w-[420px] rounded-[4px] border border-[var(--border)] bg-[var(--card)]"
      >
        <defs>
          <pattern
            id="delay-hatch"
            width="6"
            height="6"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="6" height="6" fill="var(--card)" />
            <rect width="2.5" height="6" fill="var(--muted-foreground)" opacity="0.45" />
          </pattern>
        </defs>
        {BANDS.map((b) => {
          const lo = x(b.lo);
          const hi = x(b.hi === Infinity ? xMax : b.hi);
          return (
            <rect
              key={b.key}
              x={lo}
              y={pad.top}
              width={Math.max(0, hi - lo)}
              height={baseline - pad.top}
              fill={
                b.delayed
                  ? "url(#delay-hatch)"
                  : RAMP_SOLID[b.key]
              }
              opacity={b.delayed ? 0.5 : 0.18}
            />
          );
        })}
        <path
          d={curve}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <line
          x1={x(per)}
          x2={x(per)}
          y1={pad.top}
          y2={baseline}
          stroke="var(--color-teal-700)"
          strokeWidth={2}
        />
        <circle cx={x(per)} cy={y(yMaxPdf)} r={4} fill="var(--color-teal-700)" />
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={baseline}
          y2={baseline}
          stroke="var(--color-gray-400)"
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={baseline}
              y2={baseline + 4}
              stroke="var(--color-gray-400)"
            />
            <text
              x={x(t)}
              y={baseline + 16}
              textAnchor="middle"
              className="fill-[var(--muted-foreground)] font-mono text-[10px]"
            >
              {t === DELAY_THRESHOLD ? "13.33" : t}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
