# Food tab

Owner: Siang Woo. Import `riskTab` from `./index` and supply the shared `RiskTabProps` (`crewId`, stable `vector` instance). App/body-map registration is intentionally not included.

## Data and behaviour

- `menu.ts`: four ISS-style simulated choices, including Shrimp rice with shellfish; versioned local nutrient values per 100 g, never attributed to USDA.
- `model.ts`: confirmed-meal snapshots for `(observation − 24 h, observation]`, per-portion totals, domain validation, MUST screening, escalation and comparable body-mass change.
- `store.ts`: crew/API-isolated session state; saves emit all ten `FoodSignals` fields and canonical UTC timestamps. Unknown fields remain null; a reviewed empty day emits empty arrays and known zero totals. No network or exercise-storage access.
- `FoodTab.tsx` / `food.css`: five nutrient rings, contribution details, allergen timeline, mass strip, explicit targets, local-only photo preview and call/PMC notices. Urgent answers immediately suppress results and personalisation before saving.
- `Load demo` is available on a fresh SIM-CDR session: Shrimp rice, 250 g, consumed `2026-11-14T08:00:00.000Z`, observation `2026-11-14T11:00:00.000Z`. Save to emit. Demo targets are examples, not recommendations; log completeness remains unconfirmed.

All menu-derived records are `source: simulated-crew`, `simulated: true`; known real/research vectors are rejected rather than mixed with the simulated table. Targets and tab history are session-only. Body mass requires a dated, supported, explicitly selected same-method/context vector baseline before a difference is reported.

MUST uses BAPEN's adult screening scoring: BMI >20/18.5–20/<18.5; unplanned loss <5/5–10/>10% over 3–6 months; acute illness with no intake for >5 days or likely. The source link is in the input details. Scores are labelled for follow-up, not diagnosis; the app marks Earth-population applicability. Red flags take priority over all scores.

## Verification

Run `npx --no-install vitest run src`, `npx --no-install tsc -b`, and `npx --no-install eslint .` from the checkout root. `food.test.ts` uses a small injected fake VectorApi and server rendering.

Run `node src/risks/food/ui-check.mjs` for an isolated headless Chrome check through the React form. It uses installed Chrome and an ephemeral Vite server, closes both, and does not wire App.tsx. It verifies manual confirmation/save, emitted allergen/nutrients, 320 px overflow, immediate urgent suppression, and the local call notice.

## Integration limits

- The shared baseline has no observed range, so the three-consecutive-outside-range rule cannot be derived faithfully; the UI states this. Missing groups after two check-ins, conflicting reference evidence, Something else, and MUST threshold escalation are implemented.
- No multi-day deficit claim is made from a partial day, and no five-day aggregate is invented.
- Real vector integration and registered body-map navigation remain the integrating worker's checks. No external medical call or message is sent.
