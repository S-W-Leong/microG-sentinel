# Microbiome tab

Entry: `#/risk/microbiome?crewId=SIM-CDR`, or Body map > Gut > Microbiome.

Choose **Load simulated history** in an empty session. Five check-ins contain one unchanged day followed by four explicitly changed days. The result reads **Gut pattern changed 4 days · low fibre since day 12**. All fixture data is Simulated; its fibre values are explicitly not Food logs.

Choose a timeline date to see fibre, appetite and skin observations. Enter any urgent symptom as Yes to immediately replace the result with **Contact the flight surgeon now**. **Request PMC** prepares an unscheduled local packet; **Download packet** exports it. Nothing is transmitted.

## Boundaries

- History, photos, mission start, documented personal fibre target and antibiotic courses are session-local and isolated by vector instance and crew.
- Normal check-ins read `getExposures(crewId, 24).fibreG` and preserve its provenance. Only a matching Food record on the observation's UTC date, not later than that observation, can be captured. The API cannot retrospectively query daily totals; missing historic fibre stays null.
- A low-fibre clause requires a complete below-target snapshot on every changed day, a consistent target and mission start, and documentation for the target. The fixture target is illustrative, not clinical guidance.
- UTC days use their last explicit change answer; unknown answers and intervening missing days make continuity null. Every recorded stool event remains a separate point.
- No microbial composition, inferred infection, diagnosis or GSRS score is produced. GSRS is unverified context only.
- `RiskEvaluation` has no days unit. It therefore returns `value: null`, with the count rendered in the tab rather than misrepresented as a percentage. The shared shell's generic status consequently says No data; changing that contract or status presentation is outside this worker's ownership.
- The shell freezes mission time. After saving at that time, another observation requires a later mission clock; existing observations are never overwritten.

## Validation

- `npx --no-install vitest run src/risks/microbiome`: 22 passed.
- `node src/risks/microbiome/ui-check.mjs`: actual shell route in headless installed Chrome, 320 px overflow, keyboard day selection, fixture, immediate urgent result suppression, local PMC packet download, photo and saved check-in passed.
- `npx --no-install vitest run src`: 375 passed; one unrelated shared shell expectation still treats SANS as Planned (`src/shell/integration.test.ts:41`) after its parallel registration.
- `npx --no-install tsc -b`, `npx --no-install eslint .`, `npx --no-install vite build`: passed. Vite reports its existing large-chunk advisory.
- No installs, commits, pushes or branch changes.
