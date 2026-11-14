# Flight Deck overhaul implementation plan

> **For agentic workers:** Execute sequentially in the main session, honoring the project's AGENTS.md. The user selected the first generated visual and explicitly authorized this overhaul.

**Goal:** Implement the selected Flight Deck design across the existing prototype while preserving its adaptive observation planner, evidence boundaries and complete exercise workflow.

**Architecture:** Keep all exercise calculation, planner, store, CSV and export contracts. Add a small tested presentation adapter, focused exercise components and an Observable Plot chart. Apply shared black/off-white/orange tokens and locally bundled IBM Plex fonts throughout existing routes.

**Tech Stack:** Existing React 19, TypeScript and Vite; Observable Plot for accurate data graphics; Phosphor icons; Fontsource IBM Plex Sans / Mono.

**Spec:** User-approved first displayed image, copied to `artifacts/flight-deck/reference.png`; screenshot audit in `artifacts/microg-design-audit-2026-11-14.html`; existing adaptive exercise design.

## Global constraints

- Work in the shared checkout; do not overwrite the audit artifacts or unrelated work.
- Preserve the engine, frozen baseline, browser persistence, CSV import, source isolation, review exports, human responses and every existing route.
- Match the carbon-black/off-white/signal-orange target, two-column evidence/plan layout, compact metadata and episode progress.
- All bundled assets and fonts must work without third-party requests.
- Correct the mock's chart geometry: use accurate shared heart-rate coordinates and never plot a missing value as a number.
- Adapt to 390 px without unreadable table wrapping. Use labelled controls, semantic regions, keyboard focus and reduced-motion support.
- NASA research never receives prospective collection plans or a clinical/mission determination.

## Review focus

1. Missing current HR may expose recorded baseline values only when the comparison engine identifies no other issue; incompatible metadata stays withheld.
2. New availability invalidates accepted plans; live selected opportunities and reasons update together.
3. Prepared packets remain downloadable snapshots; changed evidence is visibly marked stale, and manual responses do not imply transmission.
4. Collection adds a linked session and visibly preserves the original missing observation and frozen baseline.
5. Narrow-screen plots and workload readouts keep units, labels and primary actions usable.

### Task 1: Presentation boundary and visual foundation

**Files:** `src/ui/exercisePresentation.ts`, its unit tests, `src/index.css`, `src/App.tsx`, `src/main.tsx`, package files.

- [x] Write and run failing tests for missing-only baseline display, withheld incompatible records, missing numeric plot points, and current/stale/malformed review snapshots.
- [x] Implement presentation helpers without changing the engine.
- [x] Bundle fonts, plotting and icons; replace shared theme, shell, navigation and supporting-route controls.
- [x] Run the unit suite, lint and build.

### Task 2: Exercise workspace and research

**Files:** `src/screens/Exercise.tsx`, `src/screens/ExerciseResearch.tsx`, `src/components/exercise/`, `src/exercise.css`, existing browser specs.

**Consumes:** `buildStageReadings(dataset, comparison)`, `getPreparedReview(workspace)`, `createExerciseStore` and `evaluateWorkspace` with existing contracts.

- [x] Implement accurate responsive comparison, live opportunity switches, reason panel and state-specific primary actions.
- [x] Preserve imports, original evidence and episode history in readable disclosures.
- [x] Add readable prepared-review preview, stale marker, export formats and labelled response entry.
- [x] Apply the same system to NASA research, retaining source evidence, occasion switching and separate VO₂ links.
- [x] Align existing browser specs with intentional accessible-label changes; preserve all behavioral assertions.
- [x] Run the unit suite, lint and build.

### Task 3: Browser verification and design QA

**Files:** `design-qa.md`, `artifacts/flight-deck/`, demonstration docs.

- [x] Verify default view, alternate selection, acceptance, refresh, synthetic collection, prepared review, exports, CSV preview and edge cases through the in-app browser. See the CSV commit/link verification limit in `design-qa.md`.
- [x] Verify NASA replay and supporting routes; inspect console errors.
- [x] Capture desktop at the source viewport and narrow screen at 390 × 844.
- [x] Compare the source and implementation together; correct material differences and recapture.
- [x] Record final QA result and actual verification evidence; update demo instructions.
- [x] Leave the preview running and provide a concise handoff.

## Execution notes

- Initial baseline: 13 test files / 76 tests passed.
- The selected screen contains no raster image assets. Its marks are typography, standard controls, icon-library symbols and data graphics; no image-generation asset tasks are necessary.
- No deployment, commit or external transmission is requested.

## Final verification ledger

- Presentation tests: 7 added; full suite 14 files / 83 passed. Lint, production build and whitespace checks passed.
- Browser verification and source comparison are recorded in `design-qa.md`; final result: passed for its stated visual/interaction scope.
- CSV preview accepted 3 rows; full commit/link browser run remains unverified after a browser state reset. Existing parser/store tests passed and import contracts were preserved.
- Existing Playwright specs updated, not executed.
- Self-review performed sequentially as instructed by AGENTS.md. No calculation, planner, store or source-data changes.
- No commit or deployment performed. Preview: http://127.0.0.1:5180/.
