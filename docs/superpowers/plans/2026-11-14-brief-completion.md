# Brief Completion Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task in the main session, following the user's sequential-work instruction. Steps use checkbox syntax for tracking. This is a planning deliverable; implementation has not been authorised by this request.

**Goal:** Complete manual real-assessment entry, close the remaining transparency and evidence gaps, and produce verification and submission evidence aligned with the project brief.

**Architecture:** Keep the four-screen React app and pure assessment engine. Add a scoped in-memory user-record store and rebuild the data bridge from its current records. Keep user entries, simulated crew and frozen NASA research distinct throughout calculation, navigation and export.

**Tech Stack:** Existing React 19, TypeScript, Vite, Vitest and ESLint; add Playwright as a development-only browser acceptance tool in Task 7. No backend or new production framework.

**Spec:** [completion design](../specs/2026-11-14-brief-completion-design.md) and [project brief](../../brief.md). The user's selected extension is real manual entry. Session-only retention and the proposed comparison grouping are planning assumptions for review.

## Global Constraints

- “Aerobic fitness is the one live module.” Preserve the four screens and body-map default.
- “Research participants must never be presented as astronauts.” User entries must also retain their own source label.
- “Capacity retained (%) = current ÷ baseline × 100”; “Change (%) = (current − baseline) ÷ baseline × 100”.
- “Require a positive, finite baseline.” Missing values remain null; absolute and mass-normalized calculations remain separate.
- “Do not invent warning bands, confidence percentages or measurement-expiry periods.” Amber/reference determination remains exclusive to supported simulated in-mission crew records.
- “The prototype does not change exercise prescriptions or recommend new exercise intensity, frequency or duration.”
- “Bundle the demonstration data so the core workflow works without a network connection.” External source links can require internet.
- “Defer authentication, live NASA integration, wearables, ML and multi-domain health scores.” Preserve raw/curated replay files.
- Real entries remain in tab memory; do not put their contents in repository fixtures, logs, URLs, browser persistence or remote services.

## Review Focus

1. A new data source accidentally inherits research baseline phases, a simulated label or amber/reference determination: test explicit source/context boundaries in Tasks 1 and 7.
2. Identical participant IDs or multiple assessment series pool unrelated baselines or trend points: test source/group scoping in Tasks 1–3 and 7.
3. Blank numeric fields become zero, incomplete records disappear, or unsupported baseline points appear at 100%: test parser, unplaced records and chart behaviour in Tasks 3, 4 and 7.
4. Blocked comparisons export no baseline evidence or linked contradictory measurements are ignored: test provenance and linked conflicts in Tasks 1, 5 and 7.
5. The hosted demo works only with warmed caches, remote assets or stale module-level results: test live recomputation and a fresh production load with external requests blocked in Tasks 2 and 7.

## File ownership and boundaries

| Files | Responsibility |
|---|---|
| `src/types.ts`, `src/logic/assess.ts` | Source/group/context contract and comparison rules |
| `src/logic/manualEntry.ts` (new) | Parse draft strings into faithful user-entered records and field errors |
| `src/ui/dataSource.ts` | Pure, source-scoped selectors built from current records |
| `src/ui/AssessmentProvider.tsx` (new) | React memory, active source/participant/group, user saves/edits/reset |
| `src/components/AssessmentEntry.tsx` (new) | Accessible form inside My Fitness |
| `src/ui/presentation.ts`, existing card/chart/screens | Source copy, precise formatting, series navigation and rendering |
| `src/ui/reviewCard.ts` (new) | Testable evidence collection and JSON payload assembly |
| `src/content/references.ts` (new), `docs/source-claims.md` (new) | Reviewed resource links and source-to-claim inventory |
| `e2e/brief-acceptance.spec.ts`, `playwright.config.ts` (new) | Production browser acceptance and external-network independence |
| `docs/verification.md`, `docs/usability.md`, `docs/submission.md` (new) | Acceptance evidence, real usability results and submission preparation |

Co-locate unit tests with their implementation. Do not restructure unrelated files. Existing curation and raw data remain unchanged.

## Task 1: Extend source/context rules without changing the replay

**Files:** modify `src/types.ts`, `src/logic/assess.ts`, `src/logic/assess.test.ts`, `src/ui/presentation.ts`; add `src/ui/presentation.test.ts`.

**Interfaces:** Add `user-entered` to `DataSource`, optional `comparisonGroupId?: string` to `Assessment` (required for user records), and `not-applicable` to `Phase` for a real assessment outside a mission/study. Add `measurement` to `IssueCode` for linked contradictory capacity assertions. Keep `assess(records, assessmentId)` and `selectBaseline(records, target)` entry points.

- [ ] Write failing source/group/context tests: same identifier across all three sources never shares a baseline; two user groups never share a baseline; a user in-mission assessment accepts matching pre-mission records rather than pre-bed-rest records; explicit non-mission user records compare within their own context. A blank context remains insufficient. Require a group for user records in the engine as well as the form.
- [ ] Write failing reference/presentation tests: user ratios of 70%, 80% and 100% all have `not-applicable` reference state and neutral supported status; user missing/conflicting records are grey. Research remains neutral/grey. Simulated in-mission 70% remains below/amber.
- [ ] Write failing linked-record tests: contradictory documented capacity or phase blocks the original and linked representation; missing duplicate fields do not erase known values; duplicates never add sessions. Retain specific identity/date explanations and every existing MR080G expectation.
- [ ] Run `npm test -- src/logic/assess.test.ts src/ui/presentation.test.ts`; confirm the new cases fail for the intended missing behaviour.
- [ ] Implement explicit baseline-context mapping and source/participant/group filtering. Average all eligible matching baselines, retain invalid matching records as blockers, and expose exclusions in Task 5. Use `measurement` conflicts for incompatible recorded values; no unit conversion. Centralise source labels/notices with `sourceLabel(source: DataSource): string` and keep user-supported wording explicit about unverified transcription.
- [ ] Run the targeted tests and `npm test`; all existing replay percentages and conflicts must remain correct. Commit this independently reviewable rule change during implementation.

## Task 2: Replace the fixed data bridge with reactive scoped state

**Files:** modify `src/ui/dataSource.ts`, `src/App.tsx`, both existing components that consume the bridge, and all three screens; add `src/ui/dataSource.test.ts`, `src/ui/AssessmentProvider.tsx`.

**Interfaces:** Export `AssessmentScope = { source: DataSource; subjectId: string; comparisonGroupId?: string }` and `createDataSource(records: readonly Assessment[]): AssessmentDataSource`. The returned object keeps `getRecords`, `getRecord`, `getResults`, `getResult`, `getReplayExamples`, `getReplayResult`; change `getTrend(scope, metric, unit)` and `getLatestResult(scope)` to require explicit scope. Add `getScopes(): AssessmentScope[]` and `getEvidenceRecords(id): Assessment[]`. `useAssessments()` returns `{ data, activeScope, setActiveScope, saveUserRecord, resetUserRecords }`; `saveUserRecord(record: Assessment): void` adds or replaces only a user record with a user-owned ID.

- [ ] Write failing selector tests for fresh records after a save, exact source/group trend scoping, baseline-only groups, no extra duplicate sessions, and stable curated replay targets. A reused user ID replaces that record; bundled IDs cannot be overwritten.
- [ ] Run `npm test -- src/ui/dataSource.test.ts` and confirm the intended failures.
- [ ] Build the pure snapshot factory and provider using React state/memoization. Default to the existing simulated crew. Keep entered records separate from imported fixtures and combine them only for selectors. Restore bundled state on refresh/reset. Derive every result from current records, not a module-level cache.
- [ ] Rewire all bridge consumers to provider state, including the body map, header notices and Evidence. Detail-route source labels follow the selected record; My Fitness follows the active scope. Missing routes after a refresh explain that a session entry is no longer available. No participant information goes into route IDs.
- [ ] Run targeted tests, `npm test`, `npm run build` and `npm run lint`. Browser-smoke the existing four-screen demo before adding the form. Commit the bridge migration.

## Task 3: Add real existing-assessment entry within My Fitness

**Files:** add `src/logic/manualEntry.ts`, `src/logic/manualEntry.test.ts`, `src/components/AssessmentEntry.tsx`; modify `src/screens/MyFitness.tsx`, `src/ui/AssessmentProvider.tsx`, `src/index.css`.

**Interfaces:** Export `ManualEntryDraft` with string fields for `subjectId`, `comparisonGroupId`, `date`, `phase`, `metric`, `value`, `unit`, `bodyMassKg`, `method`, `modality`, `protocol`, `sourceNotes`, optional `duplicateOf`, and boolean `isBaseline`. Export `parseManualEntry(draft: ManualEntryDraft, id: string): { record: Assessment | null; errors: Partial<Record<keyof ManualEntryDraft, string>> }`. The form consumes provider `saveUserRecord`; a caller-generated `USER-<uuid>` ID remains stable when correcting an entry.

- [ ] Write failing parser tests: blank values become null; explicit current `0` remains zero; `2.04` retains precision; malformed strings such as `2.04x`, non-finite/negative numbers and invalid dates give field errors; baseline zero saves but assessment comparison is withheld; blank/unknown metric/unit/method options can save as incomplete. Preserve source notes as text. Force `source: 'user-entered'` regardless of draft data.
- [ ] Test required participant/group and allowed phase/metric/unit values. A supplied body mass must be positive/finite. Retain VO2peak/VO2max labels exactly. Allow an existing canonical user record as a duplicate target, including contradictory assertions for review; reject nonexistent targets, self-links, chains and links to bundled data.
- [ ] Run `npm test -- src/logic/manualEntry.test.ts`; confirm expected failures, then implement the parser and duplicate-target validation at the store boundary.
- [ ] Build an expandable form in My Fitness with labels, unknown options, example-free empty values, baseline role, source notes and a baseline-rule preview. Require a new group or an explicit existing group; show every baseline considered for that group. Let users correct their own saved entries without creating a second session. Keep bundled records read-only.
- [ ] Show “User-entered assessment” and the session-retention notice beside the form. State that values come from an existing assessment; do not add exercise-test instructions. Focus an error summary on malformed input. On successful save, select the relevant scope and result, announce the save and refresh the timeline. Provide a clear-session control.
- [ ] Handle first-record, baseline-only and incomplete/undated states without falling back to another person's latest result. Provide explicit controls for returning to the simulated crew demo. Run parser tests, the full suite, build and lint; manually enter synthetic baseline `3 L/min` and follow-up `2.4 L/min`, and verify `80.0%`, `-20.0%`, neutral status and source labels. Commit the workflow.

## Task 4: Make measurements, separate series and unsupported timeline states reproducible

**Files:** modify `src/types.ts`, `src/logic/assess.ts`, `src/ui/dataSource.ts`, `src/ui/presentation.ts`, `src/components/AssessmentCard.tsx`, `src/components/TrendChart.tsx`, `src/screens/Understand.tsx`, `src/screens/MyFitness.tsx`; extend the related unit tests.

**Interfaces:** Add `formatMeasurement(value: number | null | undefined): string` and `formatPercentage(value: number | null | undefined): string`. Measurements retain meaningful stored precision; percentages always have one decimal. Let `TrendPoint.date` be `string | null`, with null meaning temporal placement withheld. Add `getPairedRepresentation(id: string): Assessment | undefined` to the data source, using an explicit bundled replay pairing map; do not infer pairing from labels or convert values.

- [ ] Write failing formatting tests for measurement `2.725`, current `2.04`, relative baseline `29.9`, percentage `98.0` and unknown values. Verify that displayed operands correspond to the stored calculation, without rounding before arithmetic.
- [ ] Write failing timeline tests: unknown/invalid/disputed dates remain as unplaced records, unsupported baselines have null retention, duplicate representations stay excluded, and the same subject in two sources cannot join a series. Preserve original asserted dates in the record/evidence.
- [ ] Run targeted tests and confirm expected failures, then implement formatting and unplaced-record support. Update the old test that deliberately omitted undated records to the new explicit unplaced behaviour. Render unsupported baseline markers hollow in the unquantified/unplaced area, never at an invented 100%; connect only adjacent supported dated values. If any unplaced record makes chronology uncertain, withhold that selected series' connecting line and explain why. Use unique SVG accessibility IDs.
- [ ] Add labelled links/tabs between recorded absolute and mass-normalized replay representations; render only the selected unit's trend and baseline. Keep relative as the default replay. Display `2.725 L/min`, `74.9%` absolute immediate retention, `73.9%` relative immediate retention and `98.0%` relative recovery through normal navigation. Omit switches where no paired record is documented.
- [ ] Run the full suite/build/lint and browser-check both series, a hollow unsupported baseline, a missing method, and a disputed date. Add these cases to the Task 7 acceptance suite, then commit the transparency changes.

## Task 5: Preserve evidence in blocked reviews and real-entry exports

**Files:** add `src/ui/reviewCard.ts`, `src/ui/reviewCard.test.ts`; modify `src/ui/dataSource.ts`, `src/screens/Evidence.tsx`, `src/screens/Understand.tsx`, `src/components/AssessmentCard.tsx`, `src/App.tsx`.

**Interfaces:** Add `getBaselineReview(id): { rule: string; candidateIds: string[]; includedIds: string[]; exclusions: { id: string; reason: string }[] }` to `AssessmentDataSource`. Implement `buildReviewCard(data: AssessmentDataSource, assessmentId: string, exportedAt: string): ReviewCard`. Define/export `ReviewCard` in that module with `schemaVersion: 1`, source notice, result, records, baseline review and references; MR080G citation is present only for replay.

- [ ] Write failing tests for a blocked method mismatch, an invalid baseline and a linked identity/date/measurement conflict. Each export must include the target, scoped candidate baselines, linked representations, exclusion/blocking reasons, source notes and null calculation. Supported exports must include exactly the baseline IDs used and full numeric precision.
- [ ] Test notices across all three sources; real entries never claim NASA provenance, astronaut identity, independent verification or compliance. External records with the same subject/group text must not be included. Use synthetic fixtures for these tests.
- [ ] Run `npm test -- src/ui/reviewCard.test.ts`; confirm intended failures. Implement evidence collection independently of `result.calculation`. Collect current and candidate records first, then their direct linked representations; never count representations as extra sessions or silently omit the record that blocks comparison.
- [ ] Update Understand and Evidence to show the baseline rule/candidates even when no mean can be used. Use the pure builder for the existing JSON download and central source notices throughout header/card/footer. Add body mass to the visible evidence record details. Display source-appropriate follow-up and reference limits.
- [ ] Run tests/build/lint and download a supported and a blocked synthetic user review. Inspect the JSON for every relevant record, precision, source notice and issue. Commit export/provenance completion.

## Task 6: Finish the brief's resource context within its two-hour allowance

**Files:** add `src/content/references.ts`, `docs/source-claims.md`; modify `src/ui/presentation.ts`, `src/screens/Evidence.tsx`, `src/components/BodyMap.tsx`, `README.md`.

**Interfaces:** Centralise the existing URLs plus `hazards`, `ongoingResearch`, `tempusPro`, `csaScience`, `csaRadiation` in `references.ts`; retain the existing `nasa` export through presentation so the screens share one source inventory.

- [ ] Read the brief's linked primary pages and the identified NASA standard/edition. Record URL, supported section/passage, checked date and intended product copy in `docs/source-claims.md`. Do not claim that merely linking a page verifies every neighbouring sentence.
- [ ] Add concise altered-gravity/distance context, a link to ongoing HRP work acknowledging existing capabilities, and Tempus Pro as collection/integration prior art. Put CSA science motivation and radiation background in a short further-context area; add no live radiation module. Retain the fitness, Zero T2 and Standard Measures explanations close to the assessment.
- [ ] Review every health-improvement statement for an adjacent NASA link and no new prescription. Make the live heart/lungs risk label explicit and preserve all grey planned-module descriptions without measured values or scores. Keep overall context work within two hours rather than expanding the dashboard.
- [ ] Verify each outbound link and compare final copy against its source inventory; document any unavailable source or edition discrepancy honestly. Run build/lint and inspect the evidence page for reading order and length. Commit the sourced content.

## Task 7: Prove the fifteen acceptance checks on the production app

**Files:** add `playwright.config.ts`, `e2e/brief-acceptance.spec.ts`, `docs/verification.md`; modify `package.json`, `package-lock.json`.

**Interfaces:** Add development dependency `@playwright/test` and script `test:e2e`. Configure a single Chromium project and a production preview server at loopback. Consult current official Playwright documentation when implementing configuration; no test-only application API is needed.

- [ ] Create browser tests using synthetic values typed through the actual form. Cover add baseline → add follow-up → detail → evidence → download; correction → recomputation; source/group switching; reset and refresh. Parse downloaded JSON and check values/provenance. Assert user data never appears in request URLs and session entries disappear on reload.
- [ ] Cover first-load body map, one-click fitness, simulated card without research navigation, all planned modules, every status text/icon, and research/user neutral/grey presentation. Navigate both replay units and recovery through visible controls; assert `73.9%`, `98.0%` and baseline `2.725` in their proper contexts.
- [ ] Cover empty numeric fields, missing method/baseline, baseline-only groups, missing dates, linked identity/date conflicts and unequal-value duplicates. Assert null calculation where blocked, no extra timeline sessions, hollow unsupported markers, no fabricated 100% baseline, and no line spanning an unsupported point. A series with unplaced chronology must not reconnect the remaining dated points. Include keyboard entry/error-summary focus, narrow viewport and source labels in exported notices.
- [ ] Run the workflow in a fresh browser context with all non-loopback requests aborted before first navigation. Keep local preview reachable; navigate, enter records and download successfully. Record a separate manual run with external connectivity disabled and the production app served locally. Do not describe this as a service worker/PWA test.
- [ ] Run `npm test`, `npm run build`, `npm run lint`, then `npm run test:e2e`. Investigate failures before marking any criterion passed. Record command results, test environment and evidence paths in `docs/verification.md` against the matrix below, including remaining limitations. Commit the acceptance suite and report.

## Task 8: Run the brief's usability sessions and revise misunderstandings

**Files:** add `docs/usability.md`; modify the affected UI wording/components only as supported by observed misunderstandings; update `docs/verification.md` after revisions.

**Owner:** project team arranges three to five people. The implementer prepares materials, records supplied observations and makes the resulting software changes. No automatic messages or participant recruitment.

- [ ] Prepare a short protocol using bundled/synthetic data: simulated decline, insufficient-method example, NASA decline/recovery, and one conflict. Ask each person what changed, whether the comparison is supported and what they would do next, without leading them to the desired answer.
- [ ] Record anonymised participant/session identifiers, observed answers, misunderstandings and actionable changes. Leave sessions explicitly pending until they actually occur. Do not invent responses or describe this as clinical validation.
- [ ] Revise confusing wording and navigation. Recheck the affected acceptance/browser tests and have a participant revisit a changed flow where practical. Record unresolved misunderstandings and limitations. Commit the real observations and revisions once available.

## Task 9: Prepare the submission package and backup demonstration

**Files:** add `docs/submission.md`; update `README.md` and `docs/verification.md`; store or link the actual recording artifact in the agreed local submission location.

**Owner:** implementer prepares the draft and recording; the project team confirms the event's actual submission fields/deadline, participates in rehearsal and performs submission.

- [ ] Write the demonstration script in the brief's exact order: simulated astronaut assessment → explanation and follow-up/export → real NASA decline/recovery → one conflicting-record example. Show entry separately using synthetic values while explaining support for user-entered records.
- [ ] Draft the project description, resource use, AI disclosure, curation method, baseline assumption and limitations from the final implementation. Include reproduction commands, local/offline instructions, review-export format and the session-retention limitation. Do not claim clinical validation or completed sessions without evidence.
- [ ] Capture a backup walkthrough of the passing production build with bundled/synthetic data only; verify playback and text legibility. Record actual artifact location and completion status. Keep a local production-build backup for the demo computer.
- [ ] Rehearse the sequence and check the final readiness list: software acceptance, actual usability observations, source review, presentation, usable recording and confirmed event requirements. Track uncompleted human items explicitly. The team submits before its confirmed deadline; no publication or submission is performed merely by implementing this plan.

## Acceptance traceability

| Brief acceptance check | Implementation / evidence owner |
|---|---|
| 1. Fitness answer without research navigation | Tasks 2–3; Task 7 initial simulated card |
| 2. C3D-3985 73.9% / 98.0% | Task 4 visible replay; existing replay tests + Task 7 |
| 3. Separate absolute/relative calculations | Tasks 1, 4; unit-scoped selector and UI tests |
| 4. Missing never becomes zero | Task 3 parser; Tasks 1, 7 blocked comparisons |
| 5. Specific identity/date/method explanations | Tasks 1, 5; Task 7 conflict cases |
| 6. Duplicate files are not extra assessments | Tasks 1–3; Task 7 timeline/export |
| 7. No research operational/clinical clearance | Tasks 1, 5–7; includes third-source isolation |
| 8. Measurements, baseline assumption and source | Tasks 3–5; supported and blocked export tests |
| 9. Evidence/specialist follow-up without treatment change | Tasks 1, 5–6; Task 8 comprehension |
| 10. Bundled demonstration offline | Task 7 cold production load + manual offline run |
| 11. Body map default, heart/lungs one click | Tasks 2, 7 |
| 12. Planned modules have no measurements/status colours/scores | Tasks 6–7; grey descriptive modules |
| 13. Status labels/icons; research never amber | Tasks 1, 7 |
| 14. Hollow unsupported points, unjoined lines | Tasks 4, 7; includes unsupported baselines |
| 15. Sourced health-improvement statements; no prescriptions | Task 6 inventory/review; Tasks 7–8 presentation/comprehension |

The structured-entry deliverable additionally maps to Tasks 1–3 and 5. The resource-integration table maps to Task 6. The three-to-five-person requirement maps to Task 8; the brief's presentation/submission/rehearsal outcomes map to Task 9. These remain separate from software acceptance.

## Sequence, effort and scope protection

Execute Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 sequentially, then complete observed usability revisions and submission preparation. A source review or session preparation can be scheduled earlier by the project team, but shared-code changes remain sequential. Update this plan if findings change a task's scope.

Planning estimate: Tasks 1–5 approximately 12–20 focused engineering hours; Task 6 at most two hours; Task 7 approximately 3–5 hours; usability/revisions approximately 2–4 hours plus participant availability; submission/recording/rehearsal approximately 2–4 hours. These are rough estimates, not a new deadline or a claim that the original 48-hour clock is still available. Real-entry support accounts for additional source/context work beyond a simulated-only form.

If constrained, follow the brief's cut order: planned-module text, custom baseline editing, broad imports, elaborate animation. The last three are already outside this plan. Do not cut the body map, core card, curated replay, evidence checks or review export. Keep required entry and honest completion evidence; record any deferred requirement rather than claiming brief completion.

## Plan review

Self-review this document against the design and brief before execution: every required deliverable has an owner/task; new source/group interfaces agree across tasks; existing curated data stays frozen; all five Review Focus cases have tests; human-dependent items remain visible. Resolve the proposed retention/grouping defaults during plan review if the user wants different behaviour.

Implement in the main session using the user's sequential execution preference. Do not begin product changes until the user asks to execute the plan.
