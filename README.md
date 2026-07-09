# SNAP payment error rates and the state cost share

PolicyEngine's interactive explorer of FY2025 SNAP payment error rates for all
53 state agencies, the 0–15% state cost share they trigger under OBBBA §10105
(7 U.S.C. 2013(a)(2)) beginning FY2028, and — the point of the tool — how much
of each state's band assignment is statistical noise from the quality-control
sample. Live at [snap-per-penalty-tool.vercel.app](https://snap-per-penalty-tool.vercel.app).

The statutory cost-share tiers are not hand-coded: they are encoded in
[RuleSpec](public/rulespec/us/statutes/7/2013/a/2.yaml) and executed in the
browser by the [Axiom Foundation](https://axiom-foundation.org)'s open-source
rules engine, which re-derives every state's band and delay assignment from
the encoded law (the test suite cross-checks the compiled statute against a
dense rate sweep and all 53 published assignments).

For each state agency it shows:

- the official FY2025 payment error rate with a 95% confidence interval, and
  the FY2017–25 trajectory (FY2020–21 unpublished under COVID QC waivers);
- the statutory cost-share band and the probability a re-measured rate would
  land in each band (Normal(observed, SE), truncated at zero), following the
  confidence-interval framing of Diane Whitmore Schanzenbach's analysis
  (Bauer & Schanzenbach, Brookings, June 2026);
- FY2028 dollar exposure at the published rate and its noise-weighted
  expectation, scaled by FY2025 benefit issuance;
- a sample-size counterfactual slider (SE ∝ 1/√n) showing what larger QC
  reviews would buy in band certainty;
- a signal-vs-noise diagnostic comparing each state's FY2022–25 year-to-year
  swing to its sampling error.

Sampling SEs come from a 1,000-replicate case bootstrap of the dollar-weighted
error ratio on the FY2024 SNAP QC public-use file (44,891 reviews,
sha256-pinned), with each state's CV scaled to its official rates. Full write-up
at `/methodology`.

`/qc-liability` retains the original demo: the pre-OBBBA QC liability system
(7 CFR 275.23(d)(2)) computed in-browser by Axiom's compiled RuleSpec engine
(WebAssembly, no calculation API).

## Data pipeline

```bash
uv run data/pipeline.py   # rebuilds src/data/states.json
```

Official source tables (FNS/FNA PER PDFs and their text extracts, plus the
FY2025 National Data Bank issuance workbook) are committed under
`data/sources/`. The QC public-use file (~90 MB) downloads on demand from
snapqcdata.net into `data/cache/` and is verified against a pinned sha256.
The pipeline asserts the parsed national rates match the published 10.93%
(FY2024) and 10.62% (FY2025) and that all 53 jurisdictions parse in every year.

## Development

```bash
bun install
bun run dev    # http://localhost:3000
bun run test   # vitest — includes cross-checks against the pipeline's numbers
bun run build
```

Deploys to Vercel (project `snap-per-penalty-tool`).
