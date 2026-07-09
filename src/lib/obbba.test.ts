import { describe, expect, it } from "vitest";
import {
  bandFor,
  bandProbabilities,
  DATA,
  DELAY_THRESHOLD,
  expectedCostFY2028,
  flipProbability,
  normalCdf,
  shareFor,
} from "./obbba";

describe("shareFor", () => {
  it("matches the statutory bands (7 USC 2013(a)(2)(B)(i))", () => {
    expect(shareFor(0)).toBe(0);
    expect(shareFor(5.99)).toBe(0);
    expect(shareFor(6)).toBe(0.05);
    expect(shareFor(7.99)).toBe(0.05);
    expect(shareFor(8)).toBe(0.1);
    expect(shareFor(9.99)).toBe(0.1);
    expect(shareFor(10)).toBe(0.15);
    expect(shareFor(24.66)).toBe(0.15);
  });
});

describe("delay threshold", () => {
  it("is PER × 1.5 ≥ 20%, i.e. 13.33…%", () => {
    expect(DELAY_THRESHOLD).toBeCloseTo(13.3333, 3);
    // NY's FY2025 rate of 13.18 is below it; the published delayed set is not.
    expect(13.18 * 1.5).toBeLessThan(20);
    expect(23.15 * 1.5).toBeGreaterThanOrEqual(20);
  });
});

describe("normalCdf", () => {
  it("matches known values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.2816)).toBeCloseTo(0.1, 3);
  });
});

describe("cross-language agreement with the Python pipeline", () => {
  // The pipeline precomputed band probabilities, flip risks, and expected
  // costs with the same math in Python; the client recomputes them live for
  // the sample-size slider. They must agree.
  const states = DATA.states;

  it("reproduces every state's precomputed band probabilities", () => {
    for (const s of states) {
      const per = s.fy2025.per;
      const probs = bandProbabilities(per, s.sePpt);
      for (const key of Object.keys(s.binProbs) as (keyof typeof s.binProbs)[]) {
        expect(probs[key]).toBeCloseTo(s.binProbs[key], 3);
      }
      expect(flipProbability(per, s.sePpt)).toBeCloseTo(s.flipProb, 3);
    }
  });

  it("reproduces expected FY2028 costs, including sample-size scenarios", () => {
    for (const s of states) {
      for (const scenario of s.sampleScenarios) {
        const se = s.sePpt / Math.sqrt(scenario.k);
        const cost = expectedCostFY2028(s.fy2025.per, se, s.issuanceFY2025);
        expect(cost / 1e6).toBeCloseTo(scenario.expectedFY2028 / 1e6, 0);
      }
    }
  });

  it("agrees with the published aggregate: FY2028 point cost ≈ $9.4B", () => {
    const totalPoint = states.reduce(
      (sum, s) =>
        sum +
        (s.delayedFY2028 ? 0 : shareFor(s.fy2025.per) * s.issuanceFY2025),
      0,
    );
    // The pipeline total sums per-state values rounded to the dollar.
    expect(totalPoint / 1e6).toBeCloseTo(
      DATA.national.totalPointCostFY2028 / 1e6,
      1,
    );
    expect(totalPoint / 1e9).toBeGreaterThan(9.2);
    expect(totalPoint / 1e9).toBeLessThan(9.6);
  });

  it("flags exactly the seven FY2025-delayed jurisdictions", () => {
    const delayed = states
      .filter((s) => s.fy2025.per * 1.5 >= 20)
      .map((s) => s.abbrev)
      .sort();
    expect(delayed).toEqual(["AK", "DC", "DE", "GA", "IL", "NM", "OR"]);
    expect(delayed).toEqual([...DATA.national.delayedStatesFY2028].sort());
  });
});

describe("bandFor", () => {
  it("assigns published FY2025 rates to the right bands", () => {
    const ny = DATA.states.find((s) => s.abbrev === "NY")!;
    expect(bandFor(ny.fy2025.per).key).toBe("b10to13_33");
    const sd = DATA.states.find((s) => s.abbrev === "SD")!;
    expect(bandFor(sd.fy2025.per).key).toBe("lt6");
    const ak = DATA.states.find((s) => s.abbrev === "AK")!;
    expect(bandFor(ak.fy2025.per).delayed).toBe(true);
  });
});
