# Verification record

Implementation date: 2026-11-14. Self-review performed in the main session under the user's sequential-work instruction.

Verified commands:
- `npm test`: 61 tests passed (original 53 plus source/group, parser and blocked-export regressions).
- `npm run build`: TypeScript and production Vite build passed.
- `npm run lint`: passed.
- Production browser suite: four checks passed, including offline entry/export, separate NASA units, backup sequence and narrow/conflict checks.

Browser suite uses the production preview with Chromium. It covers manual baseline/follow-up entry, neutral real-entry status, JSON content/provenance, clearing on refresh, both NASA unit series, the demonstration sequence, narrow-screen planned-region interaction, hollow incomplete points and the 5580 conflict without amber. The first workflow blocks all non-loopback requests before first load; loopback serves the app. This verifies independence from external network requests, not PWA installation or a physically disconnected machine.

Environment: Playwright browsers downloaded to `/private/tmp/microg-playwright`. Reproduce here with `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/microg-playwright npm run test:e2e`; on a new machine install Chromium with `npx playwright install chromium` first. A sandbox may need permission to open the loopback server.

All fifteen brief criteria have implementation coverage in the plan, but this suite is not a claim that every accessibility, wording or reference boundary has exhaustive browser coverage. Remaining release work: physically disconnected demonstration, actual three-to-five-person usability sessions, team rehearsal and submission. See usability.md, submission.md and implementation-progress.md. No clinical validation is claimed.

Backup video: `artifacts/backup-demo.webm` (12 seconds, bundled data only). WebM decoding succeeded and a representative frame was inspected; this is a short automated walkthrough, with no narration.

## Adaptive exercise monitoring implementation — 2026-11-14

The exercise feature adds a separate stage dataset, CSV input, strict/qualified comparisons, exact minimum-action planning, frozen baselines, revision checks, local episode persistence/recovery, readable/JSON reviews and a separate research route. See `docs/adaptive-implementation-progress.md` for implementation rulings and residual limits.

Fresh unit verification: 76 tests passed, including original 61. TypeScript/production build and lint passed. Production Playwright checks cover adaptive availability changes, capture/refresh/export, narrow-screen symptom bypass, actual CSV upload/link/refresh, the default screen and all four legacy browser checks. Final rerun after the baseline-history regression fix: all eight browser checks passed (16.6 seconds). Screenshot artifacts: `artifacts/adaptive-exercise.png`, `artifacts/adaptive-research.png`.

External requests are blocked in the main new workflow and legacy offline workflow while loopback supplies the production app. This establishes external-network independence for those flows, not PWA installation or a physically disconnected demo. No actual users, astronauts or clinicians participated in these automated checks.
