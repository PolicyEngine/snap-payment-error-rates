"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadSnapPerRuntime,
  RULESPEC_TARGET,
  type SnapPerInputs,
  type SnapPerResult,
  type SnapPerRuntime,
  type SweepPoint,
} from "@/lib/snapPerAxiom";

const DEFAULT_INPUTS: SnapPerInputs = {
  paymentErrorRatePercent: 8,
  nationalPerformanceMeasurePercent: 7,
  statisticalProbabilityPercent: 96,
  allotments: 3_000_000_000,
  consecutiveFiscalYear: true,
};

const MILLION = 1_000_000;
const MAX_ALLOTMENTS_MILLIONS = 1_000_000;
const AXIOM_DEBOUNCE_MS = 180;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

type RunState =
  | { kind: "loading" }
  | { kind: "ready"; runtime: SnapPerRuntime; result: SnapPerResult; sweep: SweepPoint[] }
  | { kind: "error"; message: string };

type RuntimeState =
  | { kind: "loading" }
  | { kind: "ready"; runtime: SnapPerRuntime }
  | { kind: "error"; message: string };

export function SnapPerCalculator() {
  const [inputs, setInputs] = useState<SnapPerInputs>(DEFAULT_INPUTS);
  const [debouncedInputs, setDebouncedInputs] = useState<SnapPerInputs>(DEFAULT_INPUTS);
  const [allotmentsMillionsDraft, setAllotmentsMillionsDraft] = useState(
    String(DEFAULT_INPUTS.allotments / MILLION),
  );
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    loadSnapPerRuntime()
      .then((runtime) => {
        if (cancelled) {
          return;
        }
        setRuntimeState({ kind: "ready", runtime });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setRuntimeState({
          kind: "error",
          message: error instanceof Error ? error.message : "Axiom failed to initialize.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedInputs(inputs);
    }, AXIOM_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [inputs]);

  const state = useMemo<RunState>(() => {
    if (runtimeState.kind !== "ready") {
      return runtimeState;
    }

    try {
      return runAxiom(runtimeState.runtime, debouncedInputs);
    } catch (error) {
      return {
        kind: "error",
        message: error instanceof Error ? error.message : "Axiom execution failed.",
      };
    }
  }, [debouncedInputs, runtimeState]);

  const result = state.kind === "ready" ? state.result : null;
  const parameters = state.kind === "ready" ? state.runtime.parameters : null;

  return (
    <section className="min-h-screen px-5 pb-12 pt-28 md:px-8 md:pt-32">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
        <div className="grid gap-8 border-b border-[var(--border)] pb-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:items-end">
          <div>
            <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
              SNAP quality control
            </p>
            <h1 className="max-w-[760px] text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--foreground)] md:text-6xl">
              Payment error rate liability calculator
            </h1>
          </div>
          <p className="max-w-[660px] text-base leading-7 text-[var(--color-gray-600)] md:text-lg">
            A state agency fiscal-year tool for{" "}
            <code className="rounded bg-[var(--color-gray-100)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--foreground)]">
              7 CFR 275.23(d)(2)
            </code>
            . Inputs are sent to Axiom&apos;s compiled RuleSpec in the browser; the
            JavaScript layer only renders the outputs.
          </p>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
          <form
            className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_18px_48px_rgba(16,24,40,0.06)]"
            aria-label="SNAP payment error rate liability inputs"
          >
            <InputPair
              id="payment-error-rate"
              label="Payment error rate"
              value={inputs.paymentErrorRatePercent}
              min={0}
              max={20}
              step={0.01}
              suffix="%"
              onChange={(value) =>
                setInputs((current) => ({
                  ...current,
                  paymentErrorRatePercent: value,
                }))
              }
            />
            <InputPair
              id="national-performance-measure"
              label="National performance measure"
              value={inputs.nationalPerformanceMeasurePercent}
              min={0}
              max={20}
              step={0.01}
              suffix="%"
              onChange={(value) =>
                setInputs((current) => ({
                  ...current,
                  nationalPerformanceMeasurePercent: value,
                }))
              }
            />
            <InputPair
              id="statistical-probability"
              label="Statistical probability"
              value={inputs.statisticalProbabilityPercent}
              min={0}
              max={100}
              step={0.01}
              suffix="%"
              onChange={(value) =>
                setInputs((current) => ({
                  ...current,
                  statisticalProbabilityPercent: value,
                }))
              }
            />
            <div className="border-t border-[var(--color-gray-100)] py-4">
              <label
                htmlFor="allotments-millions"
                className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold text-[var(--foreground)]"
              >
                Value of all allotments issued
                <span className="font-mono text-[0.72rem] font-normal uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  annual USD, millions
                </span>
              </label>
              <input
                id="allotments-millions"
                type="number"
                min={0}
                max={MAX_ALLOTMENTS_MILLIONS}
                step={10}
                value={allotmentsMillionsDraft}
                onBlur={() => {
                  const allotments = parseAllotmentsMillions(
                    allotmentsMillionsDraft,
                    inputs.allotments,
                  );
                  setInputs((current) => ({ ...current, allotments }));
                  setAllotmentsMillionsDraft(String(allotments / MILLION));
                }}
                onChange={(event) => {
                  const rawValue = event.currentTarget.value;
                  setAllotmentsMillionsDraft(rawValue);

                  const parsed = Number(rawValue);
                  if (!rawValue || !Number.isFinite(parsed)) {
                    return;
                  }

                  setInputs((current) => ({
                    ...current,
                    allotments: clamp(parsed, 0, MAX_ALLOTMENTS_MILLIONS) * MILLION,
                  }));
                }}
                className="h-11 w-full rounded-[4px] border border-[var(--color-gray-400)] bg-[var(--background)] px-3 font-mono text-sm text-[var(--foreground)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              />
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Current example: ${number.format(inputs.allotments / MILLION)}M
                {" "}({money.format(inputs.allotments)} total) issued in the fiscal year.
              </p>
            </div>
            <div className="border-t border-[var(--color-gray-100)] pt-4">
              <label className="grid cursor-pointer grid-cols-[20px_minmax(0,1fr)] gap-3 text-sm font-semibold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={inputs.consecutiveFiscalYear}
                  onChange={(event) =>
                    setInputs((current) => ({
                      ...current,
                      consecutiveFiscalYear: event.currentTarget.checked,
                    }))
                  }
                  className="mt-0.5 h-5 w-5 accent-[var(--primary)]"
                />
                <span>Second or subsequent consecutive fiscal year</span>
              </label>
            </div>
          </form>

          <div className="grid min-w-0 gap-6">
            {state.kind === "error" ? (
              <div className="rounded-[6px] border border-[var(--text-error)] bg-[var(--card)] p-5 text-[var(--text-error)]">
                {state.message}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Metric
                    label="Liability amount"
                    value={state.kind === "ready" ? money.format(result?.amount ?? 0) : "Loading"}
                    detail={
                      result?.liabilityEstablished
                        ? `${percent.format((result.amount || 0) / Math.max(1, result.allotments))} of annual allotments`
                        : "No liability established"
                    }
                  />
                  <Metric
                    label="Trigger threshold"
                    value={result ? percent.format(result.thresholdRate) : "Loading"}
                    detail={
                      parameters
                        ? `${percent.format(parameters.perMultiplier)} of the national performance measure`
                        : "Read from compiled RuleSpec"
                    }
                  />
                  <Metric
                    label="Liability baseline"
                    value={result ? percent.format(result.baselineRate) : "Loading"}
                    detail="Excess PER above this baseline is used by the RuleSpec amount output."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Check
                    label="PER threshold"
                    passed={result?.perThresholdHolds ?? false}
                    loading={state.kind !== "ready"}
                    detail={
                      result
                        ? `${percent.format(result.paymentErrorRate)} ${
                            result.perThresholdHolds ? "exceeds" : "does not exceed"
                          } ${percent.format(result.thresholdRate)}.`
                        : "Waiting for Axiom"
                    }
                  />
                  <Check
                    label="Probability"
                    passed={result?.probabilityThresholdHolds ?? false}
                    loading={state.kind !== "ready"}
                    detail={
                      result
                        ? `${percent.format(result.statisticalProbability)} ${
                            result.probabilityThresholdHolds ? "meets" : "is below"
                          } ${percent.format(result.probabilityThreshold)}.`
                        : "Waiting for Axiom"
                    }
                  />
                  <Check
                    label="Consecutive year"
                    passed={result?.consecutiveFiscalYear ?? false}
                    loading={state.kind !== "ready"}
                    detail={
                      result?.consecutiveFiscalYear
                        ? "Liability can attach in this fiscal year."
                        : "The year trigger is not met."
                    }
                  />
                </div>

                <section className="min-w-0 rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_18px_48px_rgba(16,24,40,0.06)]">
                  <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                    <h2 className="text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                      Liability by payment error rate
                    </h2>
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                      {result ? `Current PER ${percent.format(result.paymentErrorRate)}` : "Axiom loading"}
                    </p>
                  </div>
                  <LiabilityChart
                    result={result}
                    sweep={state.kind === "ready" ? state.sweep : []}
                  />
                </section>
              </>
            )}
          </div>
        </div>

        <RuntimeFootnote state={state} />
      </div>
    </section>
  );
}

function runAxiom(runtime: SnapPerRuntime, inputs: SnapPerInputs): RunState {
  const result = runtime.runScenario(inputs, "explain");
  const maxPerPercent = Math.max(
    20,
    Math.ceil(Math.max(
      result.paymentErrorRate * 100,
      result.thresholdRate * 100,
      result.baselineRate * 100,
    ) * 1.2),
  );
  return {
    kind: "ready",
    runtime,
    result,
    sweep: runtime.runSweep(inputs, maxPerPercent, 96),
  };
}

function InputPair({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="border-t border-[var(--color-gray-100)] py-4 first:border-t-0 first:pt-0">
      <label
        htmlFor={id}
        className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold text-[var(--foreground)]"
      >
        {label}
        <span className="font-mono text-[0.72rem] font-normal uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {value.toFixed(2)}
          {suffix}
        </span>
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3 max-[520px]:grid-cols-1">
        <input
          id={`${id}-range`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(readNumber(event.currentTarget.value, value))}
          className="w-full accent-[var(--primary)]"
          aria-label={`${label} slider`}
        />
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(readNumber(event.currentTarget.value, value))}
          className="h-10 w-full rounded-[4px] border border-[var(--color-gray-400)] bg-[var(--background)] px-3 font-mono text-sm text-[var(--foreground)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="min-h-[132px] rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_18px_48px_rgba(16,24,40,0.06)]">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-4 break-words text-3xl font-semibold leading-none tracking-[-0.02em] text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-5 text-[var(--color-gray-600)]">{detail}</p>
    </article>
  );
}

function Check({
  label,
  passed,
  loading,
  detail,
}: {
  label: string;
  passed: boolean;
  loading: boolean;
  detail: string;
}) {
  const tone = loading
    ? "border-[var(--border)] text-[var(--muted-foreground)]"
    : passed
      ? "border-[var(--text-success)] text-[var(--text-success)]"
      : "border-[var(--text-error)] text-[var(--text-error)]";

  return (
    <article className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-4">
      <div
        className={`inline-flex h-7 min-w-20 items-center justify-center rounded-full border px-3 font-mono text-xs uppercase tracking-[0.12em] ${tone}`}
      >
        {loading ? "Run" : passed ? "Holds" : "Fails"}
      </div>
      <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">{label}</h3>
      <p className="mt-1 text-sm leading-5 text-[var(--color-gray-600)]">{detail}</p>
    </article>
  );
}

function LiabilityChart({
  result,
  sweep,
}: {
  result: SnapPerResult | null;
  sweep: SweepPoint[];
}) {
  const chart = useMemo(() => {
    const width = 960;
    const height = 320;
    const pad = { left: 76, right: 24, top: 24, bottom: 44 };
    const xMax = Math.max(1, sweep.at(-1)?.perPercent ?? 20);
    const yMaxRaw = Math.max(1, ...sweep.map((point) => point.amount));
    const yStep = yMaxRaw >= 10_000_000 ? 5_000_000 : yMaxRaw >= 1_000_000 ? 1_000_000 : 100_000;
    const yMax = Math.max(yStep, Math.ceil(yMaxRaw / yStep) * yStep);
    const x = (perPercent: number) =>
      pad.left + (perPercent / xMax) * (width - pad.left - pad.right);
    const y = (amount: number) =>
      height - pad.bottom - (amount / yMax) * (height - pad.top - pad.bottom);
    const path =
      sweep.length > 0
        ? sweep
            .map((point, index) => {
              const command = index === 0 ? "M" : "L";
              return `${command}${x(point.perPercent).toFixed(2)},${y(point.amount).toFixed(2)}`;
            })
            .join(" ")
        : "";

    return { width, height, pad, xMax, yMax, x, y, path };
  }, [sweep]);

  const currentX = result ? chart.x(result.paymentErrorRate * 100) : 0;
  const currentY = result ? chart.y(result.amount) : 0;
  const thresholdX = result ? chart.x(result.thresholdRate * 100) : null;
  const baselineX = result ? chart.x(result.baselineRate * 100) : null;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="max-w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="Line chart of Axiom-computed liability by payment error rate"
        className="h-[320px] min-w-[720px] rounded-[4px] border border-[var(--border)] bg-[var(--background)]"
      >
        {grid.map((share) => {
          const amount = chart.yMax * share;
          const y = chart.y(amount);
          return (
            <g key={share}>
              <line
                x1={chart.pad.left}
                x2={chart.width - chart.pad.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
              />
              <text x={12} y={y + 4} className="fill-[var(--muted-foreground)] font-mono text-[12px]">
                {compactMoney(amount)}
              </text>
            </g>
          );
        })}
        {grid.map((share) => {
          const perPercent = chart.xMax * share;
          const x = chart.x(perPercent);
          return (
            <g key={perPercent}>
              <line
                x1={x}
                x2={x}
                y1={chart.height - chart.pad.bottom}
                y2={chart.height - chart.pad.bottom + 6}
                stroke="var(--color-gray-400)"
              />
              <text
                x={x - 16}
                y={chart.height - 14}
                className="fill-[var(--muted-foreground)] font-mono text-[12px]"
              >
                {perPercent.toFixed(1)}%
              </text>
            </g>
          );
        })}
        {thresholdX !== null && (
          <g>
            <line
              x1={thresholdX}
              x2={thresholdX}
              y1={chart.pad.top}
              y2={chart.height - chart.pad.bottom}
              stroke="var(--text-warning)"
              strokeDasharray="6 5"
            />
            <text
              x={Math.min(thresholdX + 8, chart.width - 108)}
              y={chart.pad.top + 16}
              className="fill-[var(--text-warning)] font-mono text-[12px]"
            >
              105% NPM
            </text>
          </g>
        )}
        {baselineX !== null && (
          <g>
            <line
              x1={baselineX}
              x2={baselineX}
              y1={chart.pad.top}
              y2={chart.height - chart.pad.bottom}
              stroke="var(--color-gray-400)"
              strokeDasharray="3 5"
            />
            <text
              x={Math.min(baselineX + 8, chart.width - 118)}
              y={chart.height - chart.pad.bottom - 10}
              className="fill-[var(--muted-foreground)] font-mono text-[12px]"
            >
              6% baseline
            </text>
          </g>
        )}
        {chart.path && (
          <path
            d={chart.path}
            fill="none"
            stroke="var(--chart-1)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        )}
        {result && (
          <circle
            cx={currentX}
            cy={currentY}
            r={5.5}
            className="fill-[var(--color-teal-700)]"
          />
        )}
      </svg>
    </div>
  );
}

function RuntimeFootnote({ state }: { state: RunState }) {
  const ready = state.kind === "ready";

  return (
    <footer className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-sm leading-6 text-[var(--color-gray-600)]">
      <p>
        <span className="font-semibold text-[var(--foreground)]">Execution:</span>{" "}
        {ready
          ? `Rust axiom-rules-engine ${state.runtime.engineVersion}, artifact format ${state.runtime.artifactFormatVersion}, compiled to WebAssembly and running in this browser.`
          : "Axiom Rules Engine WebAssembly runtime loading in this browser."}{" "}
        The calculation compiles{" "}
        <code className="font-mono text-[0.86em] text-[var(--foreground)]">
          {RULESPEC_TARGET}
        </code>{" "}
        from the bundled RuleSpec YAML; no hosted calculation API is called.
      </p>
      <p className="mt-2">
        Other Axiom demos in the shell, including FinBot and CO SNAP cliffs, use
        hosted compute services for native Rust engine execution. This one is
        intentionally client-side so the RuleSpec-to-output path is visible and portable.
      </p>
    </footer>
  );
}

function readNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAllotmentsMillions(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, 0, MAX_ALLOTMENTS_MILLIONS) * MILLION;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function compactMoney(value: number) {
  if (value >= 1_000_000) {
    return `$${number.format(value / 1_000_000)}M`;
  }
  if (value >= 1_000) {
    return `$${number.format(value / 1_000)}K`;
  }
  return money.format(value);
}
