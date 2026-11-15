# Adaptive Exercise Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task in the main session. The user's sequential-work instruction overrides subagent-driven execution. Steps use checkbox (`- [ ]`) syntax for tracking. This request authorizes planning; do not begin product implementation until the plan review is complete.

**Goal:** Build an offline cycling-observation workflow that compares documented exercise responses, selects the least burdensome eligible observation from an existing prescribed schedule, and preserves an episode through preparation for review.

**Architecture:** Add an exercise feature alongside the existing VO2 assessment engine. Pure modules own validation, comparison, planning and episode transitions; one browser store owns persistence and React subscriptions. Real NASA research replay and simulated crew planning use explicit separate policies and never share participants, schedules or baselines.

**Tech Stack:** Existing React 19, TypeScript, Vite, Vitest, ESLint and Playwright. Browser localStorage for small, versioned demonstration workspaces; no backend or additional production dependencies.

**Spec:** [Approved adaptive exercise monitoring design](../specs/2026-11-14-adaptive-exercise-monitoring-design.md). Read both documents; this plan fixes implementation details left to the builder by that design.

## Global Constraints

- "Support cycling only."
- "Live device connectivity is a later integration."
- "Never pool people, sources or comparison series."
- "Exercise heart rate never becomes an inferred VO2 measurement"; retain the existing formal VO2 engine separately.
- "It never invents a workload, changes an exercise prescription, or extrapolates from a different device merely to produce an answer."
- "Reported symptoms or an explicit user request for review bypass collection optimization and open the review workflow."
- "A future measurement cannot establish an earlier device, protocol or identity."
- "New measurements remain linked to the episode and do not silently redefine its baseline."
- "Synthetic policies and outcomes are never attributed to NASA."
- "A local export does not imply successful transmission or receipt."
- "Actual time savings require observed results." No clinical validation, diagnostic accuracy, earlier-warning or efficacy claims from software tests.
- Raw NASA files, the existing frozen `mr080g_replay.json`, and the 61 existing unit tests retain their existing meanings. Add a separate stage artifact.
- Implement sequentially. Before code execution, use `superpowers:using-git-worktrees` to select safe isolation and a `shiwei/` branch; preserve unrelated work. No worktree or commits are created by this planning task.

## Review Focus

1. Two representations or repeated stages of one occasion must not inflate baseline count or establish persistence across sessions — Tasks 1 and 3.
2. Rest, peak, reordered stages, unknown protocols and same subject text in another source must not produce an apparently compatible prospective comparison — Task 3.
3. Expired, unavailable or under-specified scheduled opportunities must never be selected; impossible coverage must remain explicit — Task 4.
4. A changed schedule, newly added observation, corrupted storage, stale second tab or failed write must not leave stale recommendations, silently overwrite work or falsely claim work was saved — Tasks 5 and 6.
5. Review requests, imported symptom text and generated packets must not postpone review, execute markup or claim transmission; historical export evidence must remain reproducible — Tasks 2, 5, 7 and 9.

## Repository map and ownership

Paths below are relative to this repository. New tests live beside their modules, following existing Vitest discovery. Keep the old `src/types.ts`, `src/logic/assess.ts` and `src/ui/reviewCard.ts` contracts intact.

| Files | Responsibility |
|---|---|
| `src/exercise/types.ts`, `validation.ts` | New domain contracts and runtime validation |
| `data/curated/mr080g_exercise_stages.json`, `src/exercise/data/nasa.ts`, `data/scenarios.ts` | Source-backed stage artifact; synthetic crew fixtures and schedules |
| `src/exercise/csv.ts` | Documented demo-only CSV parsing and preview |
| `src/exercise/comparison.ts` | Eligibility, descriptive differences and scoped evidence gaps |
| `src/exercise/planner.ts` | Opportunity validation, exact coverage and deterministic ranking |
| `src/exercise/episodes.ts` | Immutable episode lifecycle and derived current evaluation |
| `src/exercise/storage.ts`, `store.ts`, `useExerciseStore.ts` | Versioned workspace, notifications and React bridge |
| `src/exercise/reviewPacket.ts`, `evaluation.ts` | Reproducible review exports and labelled software-case evaluation |
| `src/exercise/components/{ComparisonDetails,ObservationPlan,EpisodeReview,ExerciseImport}.tsx` | Focused interactive parts of the episode journey |
| `src/screens/{Exercise,ExerciseResearch}.tsx`, `src/App.tsx`, `src/index.css` | Main route, NASA route, navigation and existing-style integration |
| `e2e/adaptive-exercise.spec.ts`, `e2e/brief-acceptance.spec.ts` | New acceptance journey and retained legacy checks |
| `docs/{exercise-import,exercise-evaluation,exercise-demo}.md`, existing release docs | Import format, reproducible evaluation, demo and honest readiness record |

This is one integrated vertical slice. Each task below produces a separately checkable deliverable; none is an independent new product.

## Contracts fixed by this plan

Define these exported types in `src/exercise/types.ts`. Use readonly inputs and explicit null for missing measurements. No `any`, Date objects in persisted state, or calculations stored as authoritative inputs.

| Type | Required shape / meaning |
|---|---|
| `ExerciseScope` | `{ source: 'simulated-crew' \| 'nasa-research-replay'; subjectId: string; seriesId: string }` |
| `SourceRef` | `{ path: string; locator: string; note: string }`; paths/locators are inert text |
| `StageContext` | `{ deviceId: string \| null; protocolId: string \| null; posture: 'seated' \| 'supine' \| null; stageIndex: number \| null; workloadW: number \| null; durationSec: number \| null; precedingStages: readonly { workloadW: number; durationSec: number }[] \| null }` |
| `ExerciseSession` | `{ id; scope; date: string \| null; isBaseline: boolean; researchBasisId: string \| null; symptoms: readonly string[]; notes: readonly string[]; sourceRefs: readonly SourceRef[] }` |
| `StageObservation` | `{ id; sessionId; context: StageContext; hrBpm: number \| null; rpe: number \| null; rpeScale: 'borg-6-20' \| null; quality: { state: 'usable' \| 'unusable' \| 'unknown'; basis: string }; duplicateOf: string \| null; sourceRefs: readonly SourceRef[] }` |
| `ExerciseDataset` | `{ sessions: readonly ExerciseSession[]; stages: readonly StageObservation[] }` |
| `ComparisonPolicy` | `'research-descriptive-v1' \| 'crew-demo-v1'`; mode must agree with the source |
| `StageComparison` | `{ targetStageId; state: 'comparable' \| 'outside-baseline-range' \| 'insufficient' \| 'incompatible'; basis: 'strict' \| 'qualified-research'; baselineSessionIds: readonly string[]; baselineValues: readonly number[]; baselineMeanBpm: number \| null; baselineRangeBpm: readonly [number, number] \| null; currentBpm: number \| null; deltaBpm: number \| null; issues: readonly string[]; limits: readonly string[] }` |
| `EvidenceGap` | `{ id; kind: 'historical-metadata' \| 'record-conflict' \| 'new-observation'; recordId: string; requiredContext: StageContext \| null; requiredFields: readonly ('hrBpm' \| 'rpe')[]; reason: string }`. Record identity remains attached to the original gap. |
| `SessionComparison` | `{ scope; targetSessionId; stages: readonly StageComparison[]; gaps: readonly EvidenceGap[]; symptoms: readonly string[]; outsideRangeStageIds: readonly string[]; independentFollowUpSessionIds: readonly string[] }` |
| `ObservationOpportunity` | `{ id; scope; plannedSessionId: string; scheduledAt: string; prescribed: boolean; available: boolean; segments: readonly { context: StageContext; provides: readonly ('hrBpm' \| 'rpe')[] }[]; additionalCrewActions: number; effortBasis: string }`. One capture action may cover several prescribed stages. |
| `PlanInput` | `{ scope; nowISO: string; policy: ComparisonPolicy; gaps: readonly EvidenceGap[]; opportunities: readonly ObservationOpportunity[]; symptomsReported: boolean; reviewRequested: boolean }` |
| `ObservationPlan` | `{ state: 'none-needed' \| 'planned' \| 'unresolved' \| 'review' \| 'research-only'; selectedIds: readonly string[]; coverage: readonly { gapId: string; opportunityId: string }[]; unmetGapIds: readonly string[]; rejected: readonly { opportunityId: string; reasons: readonly string[] }[]; totalAdditionalCrewActions: number; completionAt: string \| null; reasons: readonly string[]; policyVersion: 'exercise-demo-v1' }` |

In these shapes, bare `id`, `targetStageId`, etc. are strings; fields referencing one of the named types use that type. Schema constants and limits belong in `validation.ts`, not UI components.

MVP policy choices: two distinct baseline sessions are required to compute an observed range; no statistical confidence or clinical threshold is inferred. HR is required for a stage comparison; RPE is optional context unless a scenario's explicit collection gap requests it. A missing/unusable HR can create a new replacement-observation gap using fully documented context. Unknown historical metadata and source conflicts require record review; they are not filled by a future workout. New completed observations become a new active session with the original still visible.

## Task 1: Establish validated stage records and reproducible fixtures

**Files:** create `src/exercise/types.ts`, `src/exercise/validation.ts`, `src/exercise/validation.test.ts`, `src/exercise/data/nasa.ts`, `src/exercise/data/nasa.test.ts`, `src/exercise/data/scenarios.ts`, `data/curated/mr080g_exercise_stages.json`; extend `data/curated/README.md`.

**Interfaces:** `validateExerciseDataset(value: unknown): { ok: true; data: ExerciseDataset } | { ok: false; errors: readonly string[] }`; export `nasaExercise: ExerciseDataset`, `createCrewScenario(variant: 'missing-hr' | 'complete' | 'mismatch' | 'no-opportunity' | 'symptoms'): CrewScenario`, and `createDemoCapture(opportunity: ObservationOpportunity, captureId: string): ExerciseDataset`. Define `CrewScenario = { id: string; dataset: ExerciseDataset; baselineSessionIds: readonly string[]; targetSessionId: string; opportunities: readonly ObservationOpportunity[]; nowISO: string }`.

- [ ] Add `it('curates four occasions and twelve non-peak stages', ...)` with `expect(nasaExercise.sessions).toHaveLength(4)` and `expect(nasaExercise.stages).toHaveLength(12)`. At 100 W, baseline HRs are `[125, 124]`, post-bed-rest is `166`, recovery is `139`; 100 W RPEs are `[11, 11, 11, 9]`. Test that duplicate representations do not create another session and that the 150 W `Peak` row is not the three-minute stage.
- [ ] Run `npx vitest run src/exercise/validation.test.ts src/exercise/data/nasa.test.ts`; expect failure because the exercise modules/artifact are absent.
- [ ] Implement the contracts and runtime validator. Reject duplicate primary IDs, orphaned stages, invalid calendar dates, non-finite values, negative workloads, non-positive measured HR/durations and invalid enum values. Reject self-linked, dangling, chained or cross-scope `duplicateOf` links; valid direct alternative assertions remain records for comparison to inspect. Preserve nulls; preserve 0 W rest records but exclude them from active-stage comparison later. RPE, when supplied, must be an integer from 6 through 20 with its scale.
- [ ] Curate exactly four C3D-3985 occasions from `data/raw/MR080G_Campaign_3_Aerobic_Capacity_Summary/MR080G_Campaign_3_C3D_3985_Peak_{070122,070127,070506,070517}_summary.csv`: stages 1–3 at 50/100/150 W, each 180 seconds. IDs: `MR080G-C3D-3985-<date>` and `<sessionId>-S<stage>`. Preserve literal dates, row references and the May 6 termination context from its summary ReadMe. Do not infer exercise posture/device from resting measurements. Leave undocumented protocol/device/posture null and signal quality unknown. Use a documented curation basis ID for qualified research comparison; it is not prospective protocol approval.
- [ ] Build one synthetic source/subject with a distinct `seriesId` and ID namespace per scenario, each with two baseline sessions and one follow-up. Provide explicit seated cycle device/protocol metadata, quality assertions, fixed dates/clock and an existing prescribed schedule. No research identifiers. `missing-hr` has null HR at 100 W; `mismatch` changes a documented protocol; `symptoms` records reported symptoms. Derive variants from measurements/metadata, never result labels. Switching scenarios must not replace records used by an earlier episode.
- [ ] Implement `createDemoCapture` for eligible simulated opportunities only. Copy the opportunity's documented stage contexts into a new session whose ID is `captureId`, retaining synthetic provenance and scheduled date. Deterministic demo HRs at 50/100/150 W are 120/145/165 bpm, with RPE 11 and quality basis `Generated demonstration data`. Reject unsupported workload contexts instead of inventing samples. These are fixture inputs, not predicted outcomes; the comparison/planner still compute their results. CSV input provides non-scripted observations.
- [ ] Rerun targeted tests, then `npm test`; all old tests retain their meaning. Commit only this task's files during implementation: `feat: add sourced exercise stage records`.

## Task 2: Import a narrow demonstration CSV without losing evidence

**Files:** create `src/exercise/csv.ts`, `src/exercise/csv.test.ts`, `docs/exercise-import.md`.

**Interfaces:** `parseExerciseCsv(text: string): CsvPreview`; `CsvPreview = { dataset: ExerciseDataset; acceptedRows: readonly number[]; rejectedRows: readonly { row: number; message: string }[]; canCommit: boolean }`. Import sets source to `simulated-crew` and labels it imported demonstration data; the file cannot select NASA provenance.

- [ ] Add `it('preserves missing HR without treating it as zero', ...)` asserting `expect(preview.dataset.stages[0].hrBpm).toBeNull()`. Add `it('rejects conflicting session metadata transactionally', ...)` asserting `expect(preview.canCommit).toBe(false)`. Reject `NaN`, scientific overflow, impossible dates or unknown columns. Include BOM/CRLF, quoted commas/newlines, escaped quotes, inert `<script>` text and a zero-workload rest row.
- [ ] Run `npx vitest run src/exercise/csv.test.ts`; expect missing parser failures.
- [ ] Define this exact CSV header in the implementation and template: `sessionId,subjectId,seriesId,date,isBaseline,deviceId,protocolId,posture,stageId,stageIndex,workloadW,durationSec,hrBpm,rpe,rpeScale,quality,qualityBasis,symptoms,notes`. Per session, repeated metadata must agree. `symptoms` is one optional literal note, not a JSON array; notes and symptoms are never executed. Preceding stages are derived only from a complete documented ordered prefix; missing prefix remains null. Stage averages are not sample streams.
- [ ] Implement a strict CSV reader supporting quoted fields and UTF-8 text, with a 1 MiB / 2,000-data-row limit and a useful file-level error. Blank optional values become null; explicit invalid values are rejected. No silent unit conversion, inference of missing HR, outlier deletion or partial commit: any rejected row disables commit while the preview still lists accepted/rejected rows. Duplicate identical stage rows are idempotent; contradictory rows are rejected with row numbers.
- [ ] Rerun parser tests and `npm test`. Document units in column names, enums, limits, template, demo-only source and correcting errors. Commit: `feat: preview exercise demonstration imports`.

## Task 3: Implement comparisons and evidence gaps independently of the UI

**Files:** create `src/exercise/comparison.ts`, `src/exercise/comparison.test.ts`.

**Interfaces:** `compareSession(dataset: ExerciseDataset, targetSessionId: string, baselineSessionIds: readonly string[], policy: ComparisonPolicy): SessionComparison`. Unknown IDs return an insufficient result with an issue, not an uncaught render error. Baseline lists are supplied explicitly and never selected from future observations.

- [ ] Add `it('describes the NASA 100 W response without a VO2 determination', ...)` with `expect(stage).toMatchObject({ baselineMeanBpm: 124.5, baselineRangeBpm: [124,125], currentBpm: 166, deltaBpm: 41.5, basis: 'qualified-research' })`. The same unknown protocol/device data must be insufficient under strict crew policy. Recovery delta is `14.5`; no VO2 value or 80% determination is created.
- [ ] Add cases for source/series/person isolation, later-dated or absent baselines, null HR, unusable quality, conflicting linked representations, unknown and mismatched posture/protocol/device, unequal duration, differing preceding workload history and 0 W rest. Duplicates cannot raise baseline `n`; two stages in one follow-up cannot claim change persisted across two sessions. A single baseline leaves range/delta unavailable and reports insufficient evidence. Missing baseline history is a review gap, never a proposal to collect a pre-exposure baseline in the future.
- [ ] Run `npx vitest run src/exercise/comparison.test.ts`; expect missing comparison behavior.
- [ ] Implement strict exact-context matching: same scope; positive active workload; equal duration, stage index and preceding-stage sequence; documented identical device/protocol/posture; usable quality with an explicit basis. Unknown requirements produce insufficient evidence, known mismatches or contradictory linked assertions produce incompatible evidence. For the curated research basis only, permit descriptive matches with missing metadata/quality clearly retained in limits; known contradictions still block.
- [ ] Count each independent baseline session once. Contradictory eligible baselines block instead of being dropped to improve the result. Compute mean/min/max and current difference without intermediate rounding. Outside-range means strictly below min or above max; endpoints are inside. Include all compared IDs/values. `compareSession` reports only the selected target in `independentFollowUpSessionIds` (or none if it is a baseline); it must not auto-include other stored sessions. Episode history supplies distinct follow-up occasions when describing repeated observations.
- [ ] Produce record-scoped gap IDs and reasons. Missing/unusable HR with otherwise complete strict context creates `new-observation`; unknown historical context creates `historical-metadata`; contradictions create `record-conflict`. RPE alone does not block an HR comparison. Do not manufacture a new-observation context from unknown historical metadata. Rerun targeted/full tests. Commit: `feat: compare eligible exercise observations`.

## Task 4: Build the adaptive observation planner

**Files:** create `src/exercise/planner.ts`, `src/exercise/planner.test.ts`.

**Interfaces:** `planObservations(input: PlanInput): ObservationPlan`; `evaluateOpportunitySelection(input: PlanInput, selectedIds: readonly string[]): OpportunitySelection`. Define `OpportunitySelection = { eligible: boolean; coveredGapIds: readonly string[]; unmetGapIds: readonly string[]; rejected: readonly { opportunityId: string; reasons: readonly string[] }[]; totalAdditionalCrewActions: number; completionAt: string | null }`. The second function is the shared eligibility/coverage evaluator for planner and checklist; it does not optimize. Use only the explicit `nowISO` clock. Maximum 16 opportunities and 12 gaps in this prototype; over-limit or malformed input returns `unresolved` with a reason and no selected opportunities.

- [ ] Write tests proving real adaptation: change candidate availability and selection changes; no gaps gives `none-needed`; no eligible cover gives `unresolved`; symptoms or explicit review gives `review`; research input gives `research-only`. Every selected gap must have an exact-context eligible provider. A future workout must not cover a historical identity/protocol gap.
- [ ] Add `it('finds a cheaper full cover than a greedy choice', ...)`: gaps A/B/C; opportunity X covers A+B for 3 actions; Y covers C for 1; Z covers A for 1; W covers B+C for 1. Assert `expect(plan.selectedIds).toEqual(['W','Z'])` and `expect(plan.totalAdditionalCrewActions).toBe(2)`. Test ties by number of opportunities, completion time, then sorted IDs; permutation of inputs must not change the result.
- [ ] Add expired/invalid timestamps, wrong scope/device/protocol/posture/history, unavailable or non-prescribed candidates, missing provided fields, duplicate IDs, negative/non-integer action costs, empty effort basis and over-limit cases. A cheaper invalid opportunity must never beat an eligible one.
- [ ] Run `npx vitest run src/exercise/planner.test.ts`; expect missing planner failures.
- [ ] Implement eligibility before ranking. Review bypass wins over gap completeness for simulated crew; research remains research-only and never schedules actions. Reject future candidates missing any required matching context. Historical metadata and record-conflict gaps remain unmet and require record review. Do not schedule a partial cover as if it completed the collection need.
- [ ] Enumerate eligible subsets (bounded above), retain those covering every requested new-observation gap, and minimize `[totalAdditionalCrewActions, opportunityCount, latestScheduledAt, sortedIds]` lexicographically. Reuse one opportunity across compatible gaps without double charging. Return coverage and rejection reasons for unselected candidates; an eligible but unselected candidate is explained as unnecessary or higher-ranked cost. Unknown effort is not zero. Rerun planner/full tests. Commit: `feat: plan minimum-effort exercise observations`.

## Task 5: Manage episodes, immutable baselines and review transitions

**Files:** create `src/exercise/episodes.ts`, `src/exercise/episodes.test.ts`; extend `src/exercise/types.ts`.

**Interfaces:** `createEpisode(dataset: ExerciseDataset, input: { id: string; scope: ExerciseScope; activeSessionId: string; baselineSessionIds: readonly string[]; createdAt: string }): ExerciseEpisode`; `reduceEpisode(episode: ExerciseEpisode, event: EpisodeEvent, context: { dataset: ExerciseDataset; evaluation: EpisodeEvaluation; opportunities: readonly ObservationOpportunity[] }): EpisodeTransition`; `evaluateEpisode(dataset: ExerciseDataset, episode: ExerciseEpisode, opportunities: readonly ObservationOpportunity[], nowISO: string, workspaceRevision: number): EpisodeEvaluation`. Define `EpisodeTransition = { ok: boolean; episode: ExerciseEpisode; message: string }`.

`ExerciseEpisode` stores `id`, `scope`, immutable `baselineSnapshot: ExerciseDataset`, `activeSessionId`, `observationSessionIds`, `revision: number`, `reviewRequested: boolean`, lifecycle `status`, `events` and `preparedReviews: readonly EpisodeReviewSnapshot[]`. Status is `observed | collection-planned | ready-for-review | prepared-for-transfer | response-recorded`.

Every `EpisodeEvent` has `id: string` and `at: string`. Cases: `{ type: 'request-review' }`; `{ type: 'accept-plan'; selectedIds: readonly string[]; basedOnRevision: number }`; `{ type: 'add-observation'; sessionId: string; basedOnRevision: number }`; `{ type: 'prepare-transfer'; basedOnRevision: number }`; `{ type: 'record-response'; note: string; actor: string }`. `basedOnRevision` identifies the workspace evaluation, not merely the episode's revision. Invalid transitions return `{ ok: false, episode: original, message }`.

`EpisodeReviewSnapshot` freezes `episodeId`, `episodeRevision`, `scope`, `activeSessionId`, `baselineSnapshot`, `observationSnapshot: ExerciseDataset`, `evaluation: EpisodeEvaluation`, `opportunities`, `events` and `preparedAt`. It does not include `preparedReviews` recursively. Capture it on `prepare-transfer`; later edits cannot change it.

- [ ] Add `it('keeps the baseline frozen when another observation is linked', ...)` asserting `expect(next.baselineSnapshot).toEqual(before.baselineSnapshot)` and that both original/new IDs remain in `observationSessionIds`. A new active session changes evaluation instead of retroactively fixing the old record. Reject wrong-scope observations, unknown IDs, reused event IDs and acceptance of a stale workspace revision.
- [ ] Test that new symptoms/review requests bypass collection, recording a response requires a prepared review, and no event type represents network send/receipt. Data changes must invalidate old accepted plans and prepared packets for current review; preserve their historical events/snapshots. Repeated observations from one session are not new independent sessions.
- [ ] Run `npx vitest run src/exercise/episodes.test.ts`; expect missing episode behavior.
- [ ] Implement immutable snapshots and explicit lifecycle transitions. `evaluateEpisode` uses the frozen baseline plus the active session and current schedule, calling Tasks 3–4. Define `EpisodeEvaluation = { comparison: SessionComparison; plan: ObservationPlan; revision: number; episodeRevision: number; evaluatedAt: string }`: `revision` is the supplied workspace revision, `episodeRevision` is `episode.revision`, and `evaluatedAt` is `nowISO`. Stored results never substitute for recomputation. Requesting review is always available. Add observations only as new immutable records; changed imports cannot overwrite historical/baseline records.
- [ ] Fix transition behavior: `accept-plan` requires an eligible full plan and moves to collection-planned; `add-observation` recomputes against the new active session and moves to observed or ready-for-review according to remaining gaps; `request-review` opens review with unresolved issues retained; `prepare-transfer` creates a frozen review snapshot and moves to prepared-for-transfer; `record-response` moves to response-recorded. A subsequent observation/schedule mutation invalidates current preparation while keeping historical snapshots accessible.
- [ ] Rerun targeted/full tests. Commit: `feat: preserve exercise episodes through review`.

## Task 6: Persist work and expose a stable React subscription

**Files:** create `src/exercise/storage.ts`, `src/exercise/storage.test.ts`, `src/exercise/store.ts`, `src/exercise/store.test.ts`, `src/exercise/useExerciseStore.ts`; extend `src/exercise/types.ts`.

**Interfaces:** `ExerciseWorkspace = { schemaVersion: 1; revision: number; scenarioId: string; nowISO: string; localDataset: ExerciseDataset; episodes: readonly ExerciseEpisode[]; opportunities: readonly ObservationOpportunity[]; activeEpisodeId: string | null }`. `localDataset` contains imported and generated demonstration observations; bundled NASA and all namespaced scenarios remain read-only. Export `getExerciseDataset(workspace: ExerciseWorkspace): ExerciseDataset` to combine these inputs without overwrites. The visible simulated clock is initialized from `CrewScenario.nowISO`, not silently replaced with wall time. `loadWorkspace(storage: StorageLike): LoadResult`; `saveWorkspace(storage: StorageLike, workspace: ExerciseWorkspace): SaveResult`; `clearWorkspace(storage: StorageLike): SaveResult`. `StorageLike` requires only `getItem`, `setItem`, `removeItem`. Define `LoadResult = { state: 'loaded' | 'empty' | 'recovery-required' | 'unavailable'; workspace: ExerciseWorkspace | null; message: string }` and `SaveResult = { ok: boolean; message: string }`.

`createExerciseStore(storage: StorageLike | null): ExerciseStore` exports `getSnapshot(): ExerciseStoreSnapshot`, `subscribe(listener: () => void): () => void`, and `dispatch(command: ExerciseCommand): { ok: boolean; message: string }`. `ExerciseStoreSnapshot = { workspace: ExerciseWorkspace; persistence: 'saved' | 'memory-only' | 'unavailable' | 'recovery-required'; notice: string }`. Define `ExerciseCommand` as: `import-preview` with `preview: CsvPreview`; `open-episode` with `episodeId: string`; `create-episode` with the Task 5 creation input; `select-scenario` with `scenarioId: string`; `update-schedule` with `opportunities` and `nowISO`; `complete-demo-observation` with `episodeId`, `opportunityId`, `captureId` and `basedOnRevision`; `episode-event` with `episodeId` and `event`; or `clear-demo`. Scenario switching retains other episode work and offers explicit reset separately. Define `useExerciseStore(): { snapshot: ExerciseStoreSnapshot; dispatch: ExerciseStore['dispatch'] }`.

- [ ] Add save/reload tests, storage-unavailable/quota cases, malformed JSON, missing references and unknown schema versions. Unknown/corrupt payload remains untouched until explicit reset; show recovery-required with a memory-only workspace. No automatic overwrite, silent loss or claim that an unsuccessful write was saved.
- [ ] Add `it('returns a cached snapshot until state changes', ...)` with `expect(store.getSnapshot()).toBe(store.getSnapshot())`. Dispatch produces one new immutable snapshot and notification; unsubscribe stops notifications. Rejected imports/commands are transactional. A same-ID/different-content import cannot overwrite a frozen record; exact duplicates are idempotent. A schedule/clock update increments workspace revision even when the episode itself has not changed, and acceptance of the old evaluation is rejected. Detect a different persisted revision from another store/tab before a write and require reload rather than clobbering it.
- [ ] Run `npx vitest run src/exercise/storage.test.ts src/exercise/store.test.ts`; expect missing storage/store failures.
- [ ] Implement key `microg.exercise.workspace.v1`. Validate all persisted/imported structures at runtime, including referential integrity and planner bounds; reject rather than normalize away conflicting records. Persist before claiming a save; on write failure keep the current tab's new work with an explicit memory-only notice and export option. Clear only the exercise key, never all origin storage. Do not persist old `user-entered` VO2 records or include them in exercise scopes.
- [ ] Keep the last successfully loaded/persisted revision separate from the in-memory workspace revision, so a failed local write is not mistaken for an external-tab conflict. Check for external changes before the next write; if present, preserve both the existing stored payload and current memory work, expose export, and require explicit reload/reset before resuming persistence. This is optimistic conflict detection, not a claim of transactional multi-tab database support.
- [ ] Make synthetic completion transactional: validate its current revision and selected eligible opportunity, call Task 1's `createDemoCapture`, append the new immutable records, visibly advance the simulated clock to the scheduled capture time and apply add-observation in one workspace mutation. A failure changes nothing. Re-evaluate afterward; do not patch a stored comparison or treat capture as data recovery on the old record. For CSV completion, commit the preview first, then explicitly link its new session through add-observation.
- [ ] Wire the hook with React `useSyncExternalStore`. Snapshot identity must be cached until mutation and subscriptions must return cleanup, as required by the [React documentation](https://react.dev/reference/react/useSyncExternalStore). Bind a single store instance per mounted application; no render-time reads/writes that create subscription loops under StrictMode. Rerun tests/full suite/build. Commit: `feat: persist demonstration exercise workspaces`.

## Task 7: Produce reproducible review packets and software-case evidence

**Files:** create `src/exercise/reviewPacket.ts`, `src/exercise/reviewPacket.test.ts`, `src/exercise/evaluation.ts`, `src/exercise/evaluation.test.ts`, `docs/exercise-evaluation.md`; extend `src/exercise/types.ts`.

**Interfaces:** `buildExerciseReviewPacket(snapshot: EpisodeReviewSnapshot, exportedAt: string): ExerciseReviewPacket`; `renderExerciseReviewText(packet: ExerciseReviewPacket): string`. The store checks revision freshness before creating the frozen review snapshot in Task 5. Old snapshots remain explicitly historical and exportable even when current recommendations have changed.

`ExerciseReviewPacket` includes `schemaVersion: 1`, exercise source/scope, episode/revision, export time, active and original observations, frozen baseline values, comparison/policy, gap decisions, schedule/selected opportunity snapshots, effort assumptions, symptom/context notes, event history, limits and primary references. It carries `transferState: 'prepared-locally'` and has no sent/received field. Do not include another scope's dataset.

`evaluateSoftwareCases(cases: readonly SoftwareCase[]): readonly SoftwareCaseResult[]`; `SoftwareCase = { id: string; input: PlanInput; fixedChecklistOpportunityIds: readonly string[] }`; `SoftwareCaseResult = { caseId: string; planner: StrategyResult; fixedChecklist: StrategyResult; comparable: boolean }`; `StrategyResult = { feasible: boolean; uncoveredGapIds: readonly string[]; additionalCrewActions: number | null; bypassed: boolean }`. Results contain modelled extra action counts, not clinical accuracy or measured human time. An invalid/incomplete strategy has null action-count savings and cannot establish an efficiency gain.

- [ ] Add `it('exports prepared evidence without implying transmission', ...)` with `expect(packet.transferState).toBe('prepared-locally')` and `expect(packet).not.toHaveProperty('sentAt')`. Test NASA symptoms/source refs, null calculation when blocked, simulated schedule snapshots, immutable baseline and cross-scope exclusion. Stale revision rejection occurs at snapshot preparation (Task 5). Strings containing markup remain inert. Rebuilding from an old snapshot with the same export time must give an identical packet after future schedule changes.
- [ ] Add a case asserting equal completed coverage with fewer modelled actions when the planner reuses a multi-stage opportunity; also test impossible and bypass cases, counting all failures. Fixed-checklist IDs must be validated with the same eligibility and coverage logic as planner IDs. No reported efficiency gain when coverage differs. Both strategies obey the same symptom/research bypass; neither earns a misleading zero-action advantage from bypassing the other strategy's required safeguards.
- [ ] Run `npx vitest run src/exercise/reviewPacket.test.ts src/exercise/evaluation.test.ts`; expect missing builders/evaluator failures.
- [ ] Implement JSON and plain-text packet builders without browser side effects. All files use safe generated names, literal note text and correctly revoked object URLs at download. Prepared-local status describes file generation only. Freeze the evaluation/schedule at packet creation, preserve precision, and use one-decimal presentation for HR differences without changing calculations.
- [ ] Implement the software-case evaluator using Task 4's `evaluateOpportunitySelection`, not a second weaker comparator. Document modelled action costs separately from actual stopwatch observations. Add a balanced-order human task protocol comparing a fixed checklist and a same-data display: record active time, actions, evidence completeness, wrong comparisons and next-step understanding. Leave participant/results fields pending until real participation. Rerun targeted/full tests and commit: `feat: export reproducible exercise reviews`.

## Task 8: Connect the short episode journey to the existing app

**Files:** create `src/screens/Exercise.tsx`, `src/screens/ExerciseResearch.tsx`, `src/exercise/components/ComparisonDetails.tsx`, `src/exercise/components/ObservationPlan.tsx`, `src/exercise/components/EpisodeReview.tsx`, `src/exercise/components/ExerciseImport.tsx`; modify `src/App.tsx:1`, `src/index.css`; add initial cases to `e2e/adaptive-exercise.spec.ts`.

**Interfaces:** `Exercise()` and `ExerciseResearch()` consume `useExerciseStore`. Components take typed props: `ComparisonDetails({ comparison: SessionComparison })`, `ObservationPlan({ plan: ObservationPlan; opportunities: readonly ObservationOpportunity[]; onAccept: (ids: readonly string[]) => void })`, `EpisodeReview({ episode: ExerciseEpisode; evaluation: EpisodeEvaluation; onEvent: (event: EpisodeEvent) => void })`, and `ExerciseImport({ onCommit: (preview: CsvPreview) => void })`. Alias the `ObservationPlan` type on import to avoid the component-name collision.

- [ ] Add `test('replans the missing-HR episode after schedule availability changes', ...)` with `await expect(page.getByRole('heading', { name: 'Next observation' })).toBeVisible()` plus an assertion on the selected opportunity before/after the actual availability control changes. Add default-route/source, synthetic completion, refresh recovery and readable-download checks. Use real controls, not test-only endpoints. Run `npm run build` and `npm run test:e2e -- e2e/adaptive-exercise.spec.ts`; confirm new-route assertions fail before UI implementation, while unit checks pass.
- [ ] Route `#/` and `#/exercise` to Exercise; `#/exercise-research` to NASA replay; `#/body-map` to the existing BodyMap. Preserve `#/fitness`, `#/understand/:id` and `#/evidence/:id` for formal VO2 assessment support. Extend document titles, source badges, focus behavior and not-found handling for every route; do not consult the legacy VO2 store to label an exercise screen. Existing links to home remain valid.
- [ ] Use existing typography/colors/panels with a compact result, evidence label and primary action first. Put detailed calculations/records in disclosures. Add labelled scenario/schedule controls and a visibly simulated clock that change data and call the engine. The simulated completion action must explicitly say it generates synthetic data; CSV import is a second actual input path. Every acceptance/capture command uses the current workspace revision and re-evaluates after changes.
- [ ] Connect CSV preview, transactional commit, local save status, explicit demo reset, context/symptom notes, review request, JSON/text downloads and manually recorded response. A review request is available regardless of whether evidence is complete. Symptoms reveal review immediately; the next workout must not appear as the remedy. Keep statuses paired with text/icons and announce saves/errors; focus the error summary on rejected imports.
- [ ] Build the separate NASA view with C3D-3985 stage comparisons, observed baseline count/range, four occasions, termination context and unresolved protocol limits. No future schedule or operational recommendation appears there. Link to existing VO2 detail routes for independently recorded capacity values without blending metrics or sources.
- [ ] Rerun new browser tests plus build/lint. Inspect the default, detailed, research, import/error and review states at desktop and 390 px width, with keyboard navigation. Do not introduce an unrelated visual redesign. Commit: `feat: connect adaptive exercise monitoring workflow`.

## Task 9: Verify the complete product and prepare a defensible demonstration

**Files:** extend `e2e/adaptive-exercise.spec.ts`; modify `e2e/brief-acceptance.spec.ts`, `README.md`, `docs/brief.md`, `docs/verification.md`, `docs/submission.md`, `docs/usability.md`, `docs/implementation-progress.md`; create `docs/exercise-demo.md`.

**Interfaces:** existing `npm test`, `npm run build`, `npm run lint`, `npm run test:e2e`. Reuse `playwright.config.ts`; no new runner or production dependency.

- [ ] Finish acceptance coverage: CSV -> episode -> compare -> plan -> accept -> synthetic new observation -> prepared text/JSON -> manual response; reload after intermediate and final states; baseline immutability; schedule invalidation; research isolation; symptom bypass; no-cover; corrupted storage/recovery; blocked storage; keyboard entry/focus, status text and narrow-screen completion. Parse downloaded files and assert data/source/revision, not merely that a button clicked.
- [ ] Move legacy body-map browser entry points from `/` to `/#/body-map`. Preserve the old session-only VO2 behavior assertions and all numeric/conflict tests; update the backup demo test to exercise the new default journey. Do not delete an old assertion just to accommodate an unrelated regression.
- [ ] Verify external-network independence from before first load by aborting non-loopback requests; the local production server remains available. Test import, persistence and download in that context. Record a separate physically disconnected demonstration with locally served `dist` if performed. Do not claim installed-PWA behavior or live device integration.
- [ ] Run `npm test`, `npm run build`, `npm run lint`, then `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/microg-playwright npm run test:e2e` when that cached browser exists (otherwise use a documented installed Chromium). Expect all old and new checks to pass; record exact counts/results rather than promising a count in advance. Current checks must pass after the final UI changes; repeat only affected checks when later fixes warrant it.
- [ ] Run the labelled software-case evaluation and save all case outcomes in `docs/exercise-evaluation.md`. Keep modelled action-count results distinct from real-user timing and clinical performance. If actual users/experts participate, record their observed results and resulting revisions; otherwise explicitly retain those items as pending. No automatic outreach or invented observations.
- [ ] Write a short demonstration script: real NASA change and source context -> simulated crew missing evidence -> judge alters schedule -> engine chooses a different eligible observation -> complete synthetic capture -> readable review. Include the no-opportunity case and explain actual versus simulated data. Produce a backup recording only from the passing production build, verify playback/legibility and record its path.
- [ ] Update the active brief/README around the final workflow, CSV contract, persistence/reset, local operation, prototype policy, NASA data use, prior art and AI disclosure. Mark the earlier brief-completion plan as historical in release notes without rewriting its recorded verification. Track actual event fields/deadline, submission, team rehearsal, users and expert review as separate human tasks; do not publish or submit anything as part of implementation.
- [ ] Perform a sequential whole-change review against the approved spec and Review Focus list; resolve material findings and rerun affected checks. Commit only final feature/release files: `test: verify adaptive exercise monitoring journey`.

## Acceptance traceability and execution gates

| Approved requirement | Owning tasks / decisive evidence |
|---|---|
| Real NASA stages and provenance, symptomatic context | 1, 3, 7, 8; literal values and source refs |
| Separate research and prospective modes | 1, 3, 4, 8, 9; research never gets a crew schedule |
| Source/person/series/context/quality eligibility | 1–3; mismatches and missing fields remain explicit |
| Descriptive change with limited baseline | 3; exact mean/range/delta, independent session count |
| Adaptive minimal-action planning and honest no-cover | 4; counterexample to greedy selection, tie/bounds tests |
| No retrospective repair or silent baseline redefinition | 3, 5, 6; old record and frozen snapshot retained |
| Symptoms/review bypass and episode lifecycle | 4, 5, 8; no delayed-review or transmission claim |
| Narrow input, persistence, explicit deletion/export | 2, 6–9; actual import/reload/download paths |
| Concise action-first experience and supporting VO2 | 8, 9; default route and retained legacy checks |
| Comparative evaluation and accurate claims | 7, 9; equal coverage, all failures, pending real-user results |

Execute Tasks 1–9 in order; review and task-local commit after each independently testable deliverable. Protect the full slice before expanding participants, integrations or visual polish. If a task exposes a scientific/data limitation that breaks the design's feasibility, record it and revisit the affected scope rather than inventing a favorable result.

Human/external gates are real-user participation, expert feedback, rehearsal and submission. They do not prevent implementing and verifying the software. They do prevent claiming their associated outcomes. Final plan review is the next checkpoint; sequential main-session execution is already the selected method.

## Planning self-review

- Spec coverage maps to the table above; no new hardware, medical model or transmission service is required.
- Later tasks consume named contracts from earlier tasks; comparison and planner policies remain separate from the legacy 80% reference logic.
- Each Review Focus item has explicit cases in its owning task and product-level checks where applicable.
- Thresholds are descriptive/prototype rules, not invented medical ranges. Missing historical metadata is not repaired by new data; sparse baselines cannot produce statistical confidence.
- The plan changes documentation only. Test execution and implementation checkboxes are for execution; none is marked complete by writing this plan.
