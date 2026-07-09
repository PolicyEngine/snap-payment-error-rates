/** Browser runtime for the RuleSpec encoding of 7 U.S.C. 2013(a)(2) — the
 * OBBBA state cost share. Compiles the YAML module once and recomputes each
 * state's statutory share and delay determination in-browser on the Axiom
 * rules engine, verifying the app's precomputed assignments against the
 * encoded law. */

export const COST_SHARE_TARGET = "us:statutes/7/2013/a/2";

const ENTITY = "StateAgency";
const ENTITY_ID = "state-agency";
const FY2028 = {
  period_kind: "custom",
  name: "fiscal_year_2028",
  start: "2027-10-01",
  end: "2028-09-30",
} as const;
const INTERVAL = { start: FY2028.start, end: FY2028.end } as const;

const OUTPUT = {
  shareRate: `${COST_SHARE_TARGET}#state_share_rate`,
  delayed: `${COST_SHARE_TARGET}#delayed_implementation`,
  shareAmount: `${COST_SHARE_TARGET}#state_share_amount`,
} as const;

type ScalarValue =
  | { kind: "bool"; value: boolean }
  | { kind: "integer"; value: number }
  | { kind: "decimal"; value: string }
  | { kind: "text"; value: string }
  | { kind: "date"; value: string };

type OutputValue =
  | {
      kind: "scalar";
      name: string;
      dtype: string;
      unit: string | null;
      value: ScalarValue;
    }
  | {
      kind: "judgment";
      name: string;
      unit: string | null;
      outcome: "holds" | "not_holds";
    };

type ExecutionResponse = {
  results: Array<{ outputs: Record<string, OutputValue> }>;
};

type AxiomWasmModule = {
  default: (options?: {
    module_or_path?: string | ArrayBuffer | Uint8Array;
  }) => Promise<unknown>;
  compile: (modulesJson: string, rootTarget: string) => string;
  execute: (artifactJson: string, requestJson: string) => string;
  engine_version: () => string;
};

export type CostShareResult = {
  shareRate: number;
  delayed: boolean;
  shareAmount: number;
};

export type CostShareRuntime = {
  engineVersion: string;
  run: (perPercent: number, allotments: number) => CostShareResult;
};

let runtimePromise: Promise<CostShareRuntime> | null = null;

export function loadCostShareRuntime(): Promise<CostShareRuntime> {
  runtimePromise ??= createRuntime();
  return runtimePromise;
}

async function createRuntime(): Promise<CostShareRuntime> {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<AxiomWasmModule>;
  const wasm = await dynamicImport("/axiom-rules-engine/axiom_rules_engine_wasm.js");
  await wasm.default({
    module_or_path: "/axiom-rules-engine/axiom_rules_engine_wasm_bg.wasm",
  });

  const yaml = await fetch("/rulespec/us/statutes/7/2013/a/2.yaml").then(
    (response) => {
      if (!response.ok) {
        throw new Error(`Could not load RuleSpec module: ${response.status}`);
      }
      return response.text();
    },
  );

  const artifact = wasm.compile(
    JSON.stringify({ [COST_SHARE_TARGET]: yaml }),
    COST_SHARE_TARGET,
  );

  return {
    engineVersion: wasm.engine_version(),
    run: (perPercent, allotments) =>
      runRequest(wasm, artifact, perPercent, allotments),
  };
}

export function buildCostShareRequest(perPercent: number, allotments: number) {
  return {
    mode: "fast",
    dataset: {
      inputs: [
        {
          name: `${COST_SHARE_TARGET}#input.payment_error_rate`,
          entity: ENTITY,
          entity_id: ENTITY_ID,
          interval: INTERVAL,
          value: { kind: "decimal", value: stableDecimal(perPercent / 100) },
        },
        {
          name: `${COST_SHARE_TARGET}#input.value_of_all_allotments_issued`,
          entity: ENTITY,
          entity_id: ENTITY_ID,
          interval: INTERVAL,
          value: { kind: "decimal", value: stableDecimal(allotments) },
        },
      ],
      relations: [],
    },
    queries: [
      {
        entity_id: ENTITY_ID,
        period: FY2028,
        outputs: [OUTPUT.shareRate, OUTPUT.delayed, OUTPUT.shareAmount],
      },
    ],
  };
}

function runRequest(
  wasm: AxiomWasmModule,
  artifact: string,
  perPercent: number,
  allotments: number,
): CostShareResult {
  const response = JSON.parse(
    wasm.execute(
      artifact,
      JSON.stringify(buildCostShareRequest(perPercent, allotments)),
    ),
  ) as ExecutionResponse;
  const outputs = response.results[0]?.outputs;
  if (!outputs) {
    throw new Error("Axiom returned no result for the cost-share query.");
  }
  return {
    shareRate: readDecimal(outputs[OUTPUT.shareRate]),
    delayed: readJudgment(outputs[OUTPUT.delayed]),
    shareAmount: readDecimal(outputs[OUTPUT.shareAmount]),
  };
}

function readDecimal(output: OutputValue | undefined): number {
  if (!output || output.kind !== "scalar") {
    throw new Error("Expected a scalar output from Axiom.");
  }
  if (output.value.kind === "decimal") return Number(output.value.value);
  if (output.value.kind === "integer") return output.value.value;
  throw new Error(`Expected numeric output, received ${output.value.kind}.`);
}

function readJudgment(output: OutputValue | undefined): boolean {
  if (!output || output.kind !== "judgment") {
    throw new Error("Expected a judgment output from Axiom.");
  }
  return output.outcome === "holds";
}

function stableDecimal(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(12)).toString();
}
