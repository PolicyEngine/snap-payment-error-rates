export const RULESPEC_TARGET = "us:regulations/7-cfr/275/23/d/2";

const ENTITY = "StateAgency";
const ENTITY_ID = "state-agency";
const YEAR_PERIOD = {
  period_kind: "custom",
  name: "calendar_year",
  start: "2003-01-01",
  end: "2003-12-31",
} as const;
const INTERVAL = {
  start: YEAR_PERIOD.start,
  end: YEAR_PERIOD.end,
} as const;

const OUTPUT = {
  perThreshold: `${RULESPEC_TARGET}#payment_error_rate_exceeds_liability_threshold`,
  liabilityEstablished: `${RULESPEC_TARGET}#payment_liability_established`,
  liabilityAmount: `${RULESPEC_TARGET}#payment_liability_amount`,
} as const;

const PARAMETER = {
  probabilityThreshold: `${RULESPEC_TARGET}#liability_statistical_probability_threshold`,
  perMultiplier: `${RULESPEC_TARGET}#payment_error_rate_performance_measure_multiplier`,
  liabilityBaseline: `${RULESPEC_TARGET}#liability_error_rate_baseline`,
  liabilityMultiplier: `${RULESPEC_TARGET}#liability_amount_multiplier`,
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
      id?: string;
      dtype: string;
      unit: string | null;
      value: ScalarValue;
    }
  | {
      kind: "judgment";
      name: string;
      id?: string;
      unit: string | null;
      outcome: "holds" | "not_holds";
    };

type ExecutionResponse = {
  metadata: {
    requested_mode: "explain" | "fast";
    actual_mode: "explain" | "fast";
    fallback_reason: string | null;
  };
  results: Array<{
    outputs: Record<string, OutputValue>;
  }>;
};

type CompiledArtifact = {
  program: {
    parameters: Array<{
      id: string;
      versions: Array<{
        values: Record<string, ScalarValue>;
      }>;
    }>;
  };
};

type AxiomWasmModule = {
  default: (options?: { module_or_path?: string | ArrayBuffer | Uint8Array }) => Promise<unknown>;
  compile: (modulesJson: string, rootTarget: string) => string;
  execute: (artifactJson: string, requestJson: string) => string;
  engine_version: () => string;
  artifact_format_version: () => number;
};

export type SnapPerInputs = {
  paymentErrorRatePercent: number;
  nationalPerformanceMeasurePercent: number;
  statisticalProbabilityPercent: number;
  allotments: number;
  consecutiveFiscalYear: boolean;
};

export type SnapPerParameters = {
  probabilityThreshold: number;
  perMultiplier: number;
  liabilityBaseline: number;
  liabilityMultiplier: number;
};

export type SnapPerResult = {
  amount: number;
  paymentErrorRate: number;
  nationalPerformanceMeasure: number;
  statisticalProbability: number;
  allotments: number;
  consecutiveFiscalYear: boolean;
  thresholdRate: number;
  baselineRate: number;
  probabilityThreshold: number;
  perThresholdHolds: boolean;
  probabilityThresholdHolds: boolean;
  liabilityEstablished: boolean;
  requestedMode: "explain" | "fast";
  actualMode: "explain" | "fast";
};

export type SweepPoint = {
  perPercent: number;
  amount: number;
  liabilityEstablished: boolean;
};

export type SnapPerRuntime = {
  engineVersion: string;
  artifactFormatVersion: number;
  parameters: SnapPerParameters;
  runScenario: (inputs: SnapPerInputs, mode?: "explain" | "fast") => SnapPerResult;
  runSweep: (inputs: SnapPerInputs, maxPerPercent: number, samples?: number) => SweepPoint[];
};

let runtimePromise: Promise<SnapPerRuntime> | null = null;

export function loadSnapPerRuntime() {
  runtimePromise ??= createRuntime();
  return runtimePromise;
}

async function createRuntime(): Promise<SnapPerRuntime> {
  const wasm = await loadWasmModule();
  await wasm.default({
    module_or_path: "/axiom-rules-engine/axiom_rules_engine_wasm_bg.wasm",
  });

  const rulespecText = await fetch(
    "/rulespec/us/regulations/7-cfr/275/23/d/2.yaml",
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load RuleSpec module: ${response.status}`);
    }
    return response.text();
  });

  const artifact = wasm.compile(
    JSON.stringify({ [RULESPEC_TARGET]: rulespecText }),
    RULESPEC_TARGET,
  );
  const parsedArtifact = JSON.parse(artifact) as CompiledArtifact;
  const parameters = extractParameters(parsedArtifact);

  function runScenario(
    inputs: SnapPerInputs,
    mode: "explain" | "fast" = "explain",
  ): SnapPerResult {
    const response = JSON.parse(
      wasm.execute(artifact, JSON.stringify(buildRequest(inputs, mode))),
    ) as ExecutionResponse;

    const result = response.results[0];
    if (!result) {
      throw new Error("Axiom returned no result for the state agency query.");
    }

    const amount = readDecimalOutput(result.outputs[OUTPUT.liabilityAmount]);
    const perThresholdHolds = readJudgmentOutput(result.outputs[OUTPUT.perThreshold]);
    const liabilityEstablished = readJudgmentOutput(
      result.outputs[OUTPUT.liabilityEstablished],
    );
    const paymentErrorRate = inputs.paymentErrorRatePercent / 100;
    const nationalPerformanceMeasure = inputs.nationalPerformanceMeasurePercent / 100;
    const statisticalProbability = inputs.statisticalProbabilityPercent / 100;

    return {
      amount,
      paymentErrorRate,
      nationalPerformanceMeasure,
      statisticalProbability,
      allotments: Math.max(0, inputs.allotments),
      consecutiveFiscalYear: inputs.consecutiveFiscalYear,
      thresholdRate: parameters.perMultiplier * nationalPerformanceMeasure,
      baselineRate: parameters.liabilityBaseline,
      probabilityThreshold: parameters.probabilityThreshold,
      perThresholdHolds,
      probabilityThresholdHolds: statisticalProbability >= parameters.probabilityThreshold,
      liabilityEstablished,
      requestedMode: response.metadata.requested_mode,
      actualMode: response.metadata.actual_mode,
    };
  }

  function runSweep(
    inputs: SnapPerInputs,
    maxPerPercent: number,
    samples = 96,
  ): SweepPoint[] {
    return Array.from({ length: samples + 1 }, (_, index) => {
      const perPercent = (maxPerPercent * index) / samples;
      const result = runScenario(
        { ...inputs, paymentErrorRatePercent: perPercent },
        "fast",
      );
      return {
        perPercent,
        amount: result.amount,
        liabilityEstablished: result.liabilityEstablished,
      };
    });
  }

  return {
    engineVersion: wasm.engine_version(),
    artifactFormatVersion: wasm.artifact_format_version(),
    parameters,
    runScenario,
    runSweep,
  };
}

async function loadWasmModule(): Promise<AxiomWasmModule> {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<AxiomWasmModule>;

  return dynamicImport("/axiom-rules-engine/axiom_rules_engine_wasm.js");
}

function buildRequest(inputs: SnapPerInputs, mode: "explain" | "fast") {
  return {
    mode,
    dataset: {
      inputs: [
        decimalInput(
          "statistical_probability",
          inputs.statisticalProbabilityPercent / 100,
        ),
        boolInput(
          "is_second_or_subsequent_consecutive_fiscal_year",
          inputs.consecutiveFiscalYear,
        ),
        decimalInput("payment_error_rate", inputs.paymentErrorRatePercent / 100),
        decimalInput(
          "national_performance_measure",
          inputs.nationalPerformanceMeasurePercent / 100,
        ),
        decimalInput("value_of_all_allotments_issued", Math.max(0, inputs.allotments)),
      ],
      relations: [],
    },
    queries: [
      {
        entity_id: ENTITY_ID,
        period: YEAR_PERIOD,
        outputs: [
          OUTPUT.perThreshold,
          OUTPUT.liabilityEstablished,
          OUTPUT.liabilityAmount,
        ],
      },
    ],
  };
}

function decimalInput(name: string, value: number) {
  return input(name, { kind: "decimal", value: stableDecimal(value) });
}

function boolInput(name: string, value: boolean) {
  return input(name, { kind: "bool", value });
}

function input(name: string, value: ScalarValue) {
  return {
    name: `${RULESPEC_TARGET}#input.${name}`,
    entity: ENTITY,
    entity_id: ENTITY_ID,
    interval: INTERVAL,
    value,
  };
}

function stableDecimal(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Number(value.toFixed(12)).toString();
}

function extractParameters(artifact: CompiledArtifact): SnapPerParameters {
  return {
    probabilityThreshold: readParameter(artifact, PARAMETER.probabilityThreshold),
    perMultiplier: readParameter(artifact, PARAMETER.perMultiplier),
    liabilityBaseline: readParameter(artifact, PARAMETER.liabilityBaseline),
    liabilityMultiplier: readParameter(artifact, PARAMETER.liabilityMultiplier),
  };
}

function readParameter(artifact: CompiledArtifact, id: string) {
  const parameter = artifact.program.parameters.find((item) => item.id === id);
  const value = parameter?.versions[0]?.values["0"];
  if (!value) {
    throw new Error(`Compiled RuleSpec artifact did not include parameter ${id}.`);
  }
  return readScalarValue(value);
}

function readDecimalOutput(output: OutputValue | undefined) {
  if (!output || output.kind !== "scalar") {
    throw new Error("Axiom did not return the expected scalar liability output.");
  }
  return readScalarValue(output.value);
}

function readJudgmentOutput(output: OutputValue | undefined) {
  if (!output || output.kind !== "judgment") {
    throw new Error("Axiom did not return the expected judgment output.");
  }
  return output.outcome === "holds";
}

function readScalarValue(value: ScalarValue) {
  if (value.kind === "decimal") {
    return Number(value.value);
  }
  if (value.kind === "integer") {
    return value.value;
  }
  throw new Error(`Expected numeric value, received ${value.kind}.`);
}
