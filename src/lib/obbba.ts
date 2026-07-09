import statesJson from "@/data/states.json";

/** OBBBA cost-share bands (7 U.S.C. 2013(a)(2)(B)(i)) plus the delay split.
 * The statute has four share tiers; we split the 15% tier at the delay
 * threshold (PER × 1.5 ≥ 20%, i.e. ≥ 13.33%) because draws above it delay a
 * state's first cost-share year rather than billing it (B)(iii). */
export const DELAY_THRESHOLD = 20 / 1.5;

export type BandKey = "lt6" | "b6to8" | "b8to10" | "b10to13_33" | "gte13_33";

export type Band = {
  key: BandKey;
  label: string;
  lo: number;
  hi: number;
  share: number;
  delayed: boolean;
};

export const BANDS: Band[] = [
  { key: "lt6", label: "<6%", lo: 0, hi: 6, share: 0, delayed: false },
  { key: "b6to8", label: "6–8%", lo: 6, hi: 8, share: 0.05, delayed: false },
  { key: "b8to10", label: "8–10%", lo: 8, hi: 10, share: 0.1, delayed: false },
  {
    key: "b10to13_33",
    label: "10–13.33%",
    lo: 10,
    hi: DELAY_THRESHOLD,
    share: 0.15,
    delayed: false,
  },
  {
    key: "gte13_33",
    label: "≥13.33%",
    lo: DELAY_THRESHOLD,
    hi: Infinity,
    share: 0.15,
    delayed: true,
  },
];

export function shareFor(per: number): number {
  if (per < 6) return 0;
  if (per < 8) return 0.05;
  if (per < 10) return 0.1;
  return 0.15;
}

/** Abramowitz & Stegun 7.1.26 — max abs error 1.5e-7, plenty for display. */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t) *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x: number, mean = 0, sd = 1): number {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

export function normalPdf(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** P(measured rate falls in each band) if the true rate equals `per`,
 * Normal(per, se) truncated below at zero — the same computation as the
 * pipeline (data/pipeline.py::bin_probabilities). */
export function bandProbabilities(
  per: number,
  se: number,
): Record<BandKey, number> {
  if (se <= 0) {
    const out = {} as Record<BandKey, number>;
    for (const b of BANDS) out[b.key] = per >= b.lo && per < b.hi ? 1 : 0;
    return out;
  }
  const below0 = normalCdf(0, per, se);
  const out = {} as Record<BandKey, number>;
  let total = 0;
  for (const b of BANDS) {
    const pLo = normalCdf(b.lo, per, se);
    const pHi = b.hi === Infinity ? 1 : normalCdf(b.hi, per, se);
    const p = Math.max(0, (pHi - pLo) / (1 - below0));
    out[b.key] = p;
    total += p;
  }
  for (const b of BANDS) out[b.key] /= total;
  return out;
}

export function bandFor(per: number): Band {
  return BANDS.find((b) => per >= b.lo && per < b.hi) ?? BANDS[BANDS.length - 1];
}

/** Probability-weighted FY2028 cost: the ≥13.33% band bills $0 in FY2028
 * because implementation is delayed for those draws. */
export function expectedCostFY2028(
  per: number,
  se: number,
  issuance: number,
): number {
  const probs = bandProbabilities(per, se);
  return BANDS.reduce(
    (sum, b) => sum + (b.delayed ? 0 : b.share) * probs[b.key] * issuance,
    0,
  );
}

export function flipProbability(per: number, se: number): number {
  return 1 - bandProbabilities(per, se)[bandFor(per).key];
}

export type StateRecord = (typeof statesJson.states)[number];
export type StatesData = typeof statesJson;

export const DATA: StatesData = statesJson;

export const money = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 999_500_000) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${Math.round(value / 1e6)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1e3)}K`;
  return `$${Math.round(value)}`;
};

export const pct = (value: number, digits = 0): string =>
  `${(value * 100).toFixed(digits)}%`;
