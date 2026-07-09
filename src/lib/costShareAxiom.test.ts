import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildCostShareRequest, COST_SHARE_TARGET } from "./costShareAxiom";
import { DATA, shareFor } from "./obbba";

/** Compile the RuleSpec encoding of 7 U.S.C. 2013(a)(2) on the real Axiom
 * WASM engine (Node build of the same binary the browser runs) and verify it
 * against the TypeScript math and every published state assignment — an
 * oracle check that the encoded law and the app agree. */

const publicDir = fileURLToPath(new URL("../../public", import.meta.url));

type Wasm = {
  default: (options?: { module_or_path?: Uint8Array }) => Promise<unknown>;
  compile: (modulesJson: string, rootTarget: string) => string;
  execute: (artifactJson: string, requestJson: string) => string;
};

let run: (perPercent: number, allotments: number) => {
  shareRate: number;
  delayed: boolean;
  shareAmount: number;
};

beforeAll(async () => {
  const wasm = (await import(
    /* @vite-ignore */ `${publicDir}/axiom-rules-engine/axiom_rules_engine_wasm.js`
  )) as Wasm;
  await wasm.default({
    module_or_path: readFileSync(
      `${publicDir}/axiom-rules-engine/axiom_rules_engine_wasm_bg.wasm`,
    ),
  });
  const yaml = readFileSync(
    `${publicDir}/rulespec/us/statutes/7/2013/a/2.yaml`,
    "utf8",
  );
  const artifact = wasm.compile(
    JSON.stringify({ [COST_SHARE_TARGET]: yaml }),
    COST_SHARE_TARGET,
  );
  run = (perPercent, allotments) => {
    const response = JSON.parse(
      wasm.execute(
        artifact,
        JSON.stringify(buildCostShareRequest(perPercent, allotments)),
      ),
    );
    const outputs = response.results[0].outputs;
    const decimal = (name: string) =>
      Number(outputs[`${COST_SHARE_TARGET}#${name}`].value.value);
    return {
      shareRate: decimal("state_share_rate"),
      delayed:
        outputs[`${COST_SHARE_TARGET}#delayed_implementation`].outcome ===
        "holds",
      shareAmount: decimal("state_share_amount"),
    };
  };
});

describe("RuleSpec encoding of 7 USC 2013(a)(2) on the Axiom engine", () => {
  it("matches the statutory tiers at every boundary", () => {
    const cases: Array<[number, number, boolean]> = [
      [0, 0, false],
      [5.99, 0, false],
      [6, 0.05, false],
      [7.99, 0.05, false],
      [8, 0.1, false],
      [9.99, 0.1, false],
      [10, 0.15, false],
      [13.32, 0.15, false],
      [13.34, 0.15, true],
      [23.15, 0.15, true],
    ];
    for (const [per, share, delayed] of cases) {
      const result = run(per, 1e9);
      expect(result.shareRate, `share at ${per}`).toBeCloseTo(share, 10);
      expect(result.delayed, `delay at ${per}`).toBe(delayed);
      expect(result.shareAmount, `amount at ${per}`).toBeCloseTo(
        share * 1e9,
        2,
      );
    }
  });

  it("agrees with the TypeScript shareFor on a dense sweep", () => {
    for (let per = 0; per <= 25; per += 0.25) {
      expect(run(per, 1e6).shareRate, `per=${per}`).toBeCloseTo(
        shareFor(per),
        10,
      );
    }
  });

  it("reproduces every published FY2025 state assignment", () => {
    for (const s of DATA.states) {
      const result = run(s.fy2025.per, s.issuanceFY2025);
      expect(result.shareRate, s.name).toBeCloseTo(s.share, 10);
      expect(result.delayed, s.name).toBe(s.delayedFY2028);
    }
  });
});
