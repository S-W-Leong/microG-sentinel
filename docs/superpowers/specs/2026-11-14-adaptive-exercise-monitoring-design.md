# Adaptive exercise monitoring design

Status: proposed design for user review. Direction selected by the user: adaptive exercise monitoring. Product code has not been changed for this pivot.

## Intent

MicroG Sentinel helps a crewmember understand changes in their response to prescribed cycling and obtain useful follow-up evidence with minimal additional work. Its central question is: **What changed, can we compare it, and what is the smallest useful next observation?**

The intended benefit is reduced collection and interpretation workload while retaining evidence that deserves specialist attention. Adoption, time savings, physiological detection performance and clinical usefulness remain hypotheses to evaluate.

The distinctive capability proposed here is selecting feasible observation opportunities from an existing exercise plan, based on missing evidence, comparison requirements and crew effort. A heart-rate trend alone is insufficient differentiation from existing exercise products.

## Decisions and assumptions

The user selected this direction over crew-and-habitat incident detection. The following implementation choices are proposals, not additional user decisions:

When approved, this design replaces the earlier brief's default body-map journey and session-only persistence choices for the pivot. Earlier documents remain a record of the current product until updated during implementation; their screen-count requirements must not silently override this design.

- Retain the existing offline React/TypeScript/Vite application and reusable provenance, identity, source-isolation and export logic.
- Deliver a software-only prototype: bundled NASA stage records, one documented CSV input format, and simulated prescribed-workout schedules. Live device connectivity is a later integration.
- Support cycling only. The existing formal VO2 assessment comparison remains available as supporting evidence; exercise heart rate never becomes an inferred VO2 measurement.
- Replace the default body-map/report journey with an exercise episode and its next action. The body map and long educational material become secondary resources.
- Persist episode work locally across refresh, with explicit export and deletion. Prototype storage is local to the browser; it is not presented as an authenticated, encrypted flight medical record.
- Keep demonstration participant data synthetic or publicly released research data. Real personal-health-data onboarding is outside the hackathon release.

## Approaches considered

1. **Adaptive exercise monitoring — selected.** It uses the team's existing NASA records and comparison experience. The challenge is proving that observation planning offers more than ordinary performance tracking.
2. **Crew-and-habitat incident detection — not selected.** It could investigate shared exposure patterns, but would require synchronized multi-person and environmental records the project does not currently possess.

Within the selected approach, use transparent matching and constraint-based planning. Do not start with a trained physiological prediction model: the small curated subset cannot establish calibration, causal inference or diagnostic performance. Broader ML work can be reconsidered after dataset suitability and independent evaluation are demonstrated.

## Two explicitly separated demonstrations

### NASA analog replay: observed evidence

Expand the frozen MR080G replay to include stage-level workload, stage duration, heart rate and Borg 6–20 exertion rating from the original summaries, with original occasion IDs and row references. Keep the current peak values and conflicts intact.

For C3D-3985, the two pre-bed-rest 100 W stages record 125 and 124 bpm; the immediate post-bed-rest stage records 166 bpm. The corresponding exertion rating is 11 in all three records. The descriptive baseline mean is 124.5 bpm and the observed difference is +41.5 bpm. The two-record range of 124–125 bpm is an observed range, not a confidence interval or population normal range.

The immediate post-bed-rest summary ReadMe also records termination due to "a little dizziness and breathing". Preserve this context. Do not describe the participant as symptom-free or claim they failed to notice their condition. The recorded recovery 100 W stage is 139 bpm; this need not track the existing VO2peak recovery percentage identically.

These are stages within formal laboratory tests, not captured routine spaceflight workouts. Show the comparison basis and missing protocol detail. NASA replay can demonstrate arithmetic, matching under documented research assumptions and provenance. It cannot establish successful prospective monitoring, earlier warning, a cause of change, or a clinical action recommendation.

### Simulated crew episode: prospective workflow

A separately labelled scenario supplies fictional workout telemetry, explicit device/protocol metadata, data-quality flags and an already prescribed future workout schedule. It demonstrates collecting and reviewing observations under the prototype policy. Synthetic policies and outcomes are never attributed to NASA.

A research participant is never placed into the simulated crew schedule. The same engine can process both sources, but operational actions are demonstrated only in the synthetic scenario.

## Core engine

### 1. Preserve and assess evidence

Model an exercise session and its stages separately from the current `Assessment` VO2 contract. Retain participant, source, session, date, device, modality, protocol, posture when known, workload and units, stage duration, stage order, HR and units, exertion scale/value, quality assertions and provenance. Preserve missing values and source disagreements.

Alternative CSV/GXT/ReadMe representations of one occasion are evidence for one occasion, not additional sessions. Distinguish a repeated time sample from an independent baseline session. Never pool people, sources or comparison series.

The strict prospective policy requires matching participant/source/series, documented compatible device and protocol context, workload, stage duration and appropriate stage order. Missing required metadata produces an evidence gap; known incompatibility blocks that comparison. Signal-quality assertions must be supplied or computed from actual samples; do not manufacture quality scores from stage averages.

The research policy may show a clearly qualified descriptive comparison using a curated documented basis, with missing protocol detail visible. It must not silently satisfy the strict prospective policy.

### 2. Describe change without inventing clinical certainty

For each eligible workload, display the baseline-session values, their count, mean and observed range, current HR and difference in bpm. Present exertion ratings alongside HR without treating the scale as a linear physiological measurement.

Use descriptive states: `comparable observation`, `change outside observed baseline range`, `insufficient evidence`, and `incompatible records`. An observation inside a small baseline range is not a healthy or safe determination. Being outside it is not a diagnosis, cause attribution, clearance decision or clinical alert threshold.

The hackathon prototype can group same-direction changes across comparable stages as an episode, but must expose that grouping rule as a prototype rule. It cannot claim a statistically calibrated anomaly probability. More baseline data are necessary before a clinically meaningful alert policy can be evaluated.

### 3. Select the smallest useful next observation

Represent each candidate as an observation opportunity in a supplied, already prescribed workout: session/time, device, protocol, stage workload/duration, expected fields, collection method and estimated additional crew actions. Candidate eligibility is separate from ranking.

The planner:

1. Identifies the explicit collection gaps preventing the comparison or review packet from being complete.
2. Reuses existing eligible measurements and identifies metadata that can be recovered from original records.
3. Considers only opportunities already present in the supplied prescribed schedule that satisfy the missing fields and comparison constraints.
4. Chooses an eligible set covering the required gaps, minimizing total additional crew actions first, then the number of opportunities, then completion time, then deterministic IDs. Effort estimates and their source/assumption are visible. Do not call this information gain or diagnostic optimization.
5. Explains which gap each selected opportunity fills and why alternatives were rejected.

With complete evidence, the planner requests no additional collection. With no eligible opportunity, it reports the unmet requirement and offers a review request. It never invents a workload, changes an exercise prescription, or extrapolates from a different device merely to produce an answer.

Gaps identify which record or future observation they concern. Missing historical metadata can be recovered only from evidence about that historical occasion; a future measurement cannot establish an earlier device, protocol or identity. A replacement observation is a new linked record, and the unusable original remains in the episode. Conflicting source assertions require record review, not a scheduled workout to make the conflict disappear.

Reported symptoms or an explicit user request for review bypass collection optimization and open the review workflow. Prototype planning is not emergency triage and must not defer review until a future workout. The symptomatic research occasion remains a research replay, not a demonstration of postponing action.

### 4. Keep an episode through review

An episode links observations, comparison decisions, missing evidence, selected opportunities, completed collection and a readable review packet. Suggested local states: `observed`, `collection planned`, `ready for review`, `prepared for transfer`, and `response recorded`.

Exports are human-readable and structured. A local export does not imply successful transmission or receipt; do not show `sent` or `received` without corresponding real integration or explicitly labelled simulated transport. A response is recorded by a human or synthetic scenario, never invented by the app. New measurements remain linked to the episode and do not silently redefine its baseline.

## User experience

The main experience is a short task: latest exercise observation, what differs, evidence quality and the next available action. Detailed calculations and source records are progressively disclosed. This is a behavioral brief; visual layouts are not approved by selecting the product direction.

The visible action is one of: inspect a documented change, resolve a collection gap, capture an observation during an existing prescribed segment, or prepare review. Research replay and simulated crew mode remain clearly distinguished. Long disclaimers and background articles must not precede the result and action; relevant limits stay accessible beside the evidence.

A narrow import format supports session/stage records with an explicit template, validation and a preview of accepted/rejected records. There is no promise to import arbitrary wearable exports. Review and persistence use pseudonymous demonstration IDs.

## Scope and delivery order

Build a complete vertical slice: stage records -> eligibility -> descriptive change -> adaptive observation choice -> saved episode -> readable review packet. First establish this with pure deterministic logic and source-backed fixtures, then connect the interface.

Prioritize C3D-3985's four occasions, one incompatible-data case and one synthetic crew episode with alternate schedules. Extend to other participants only after mapping and deduplication are verified. The raw directory contains 127 summary CSVs; that is not a count of independent sessions or participants.

Defer multi-organ health scores, diagnosis, fitness/VO2 prediction, training prescription, generative medical chat, hardware integration, real message transmission and full medical-record infrastructure.

## Demonstration and evaluation

The judge can change the available records or prescribed schedule and see an actual recomputation:

- A workload/protocol mismatch prevents an inappropriate comparison.
- Missing or unusable evidence changes the selected observation opportunity.
- Removing all eligible opportunities produces an honest unresolved gap.
- A complete episode reuses existing evidence instead of requesting redundant collection.
- A new comparable observation updates the episode and its review packet.

The NASA replay supplies genuine observed physiology and provenance. Simulated schedule/quality variations are explicitly labelled tests of the planner. Changing a fixture label must not substitute for running the rules.

Evaluate against (a) a fixed collection checklist with the same required evidence and (b) a display of the same measurements without planning. Record additional crew actions, active task time, evidence completeness, inappropriate comparisons and comprehension of the next step. Include all case variants and failures, not just the successful showcase. Prototype policy cases test software behavior, not clinical sensitivity or specificity.

If people participate, use balanced task order and report sample size, prior familiarity and errors. Actual time savings require observed results. A review by an exercise physiologist, clinician or NASA challenge expert is valuable but must be obtained before being claimed; it is not implied by citations. The team arranges any external participants or outreach.

Acceptance requires appropriate unit checks for parsing/deduplication/matching/planner invariants, an end-to-end synthetic workflow, offline network independence, persistence across refresh and accurate export state. Preserve the existing replay tests. Check keyboard use, status text beyond color and narrow-screen completion. Do not claim flight readiness, clinical validation, diagnostic accuracy, earlier warning or improved health outcomes from these checks.

## Scientific and prior-art grounding

- NASA fitness risk overview: https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/ — exercise and periodic assessment context, not approval of this planner.
- NASA aerobic/muscle evidence report: https://ntrs.nasa.gov/citations/20220019338 — submaximal responses, deconditioning and recovery; HR and VO2 endpoints cannot be treated interchangeably.
- NASA MR080G dataset: https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS — source for the bundled analog records. The current local download is the evidence reviewed; the portal has not been re-downloaded.
- Garmin Performance Condition: https://www8.garmin.com/manuals/webhelp/GUID-F41EAFB3-6CC9-42DE-9C6C-9E358DBB0671/EN-US/GUID-901ACCFC-FB0D-414E-B80C-54970AF4E357.html — existing performance tracking; do not claim HR/power baseline comparison as new.
- NASA CMO-DA work: https://ntrs.nasa.gov/citations/20260001797 — existing medical-assistant work; this design does not claim to introduce autonomous space medicine.

## Builder review and open decisions

Reviewed sequentially in the main session, honoring the user's instruction to keep subagent work sequential in the main thread. The review resolved source mixing, insufficient baselines, unknown protocol context, symptomatic records, observation-planning objectives and the distinction between an export and real transfer.

Builder discretion: exact internal interfaces, local-storage mechanism, schema-version migration, layout implementation after visual decisions, documented CSV column names and test tooling within the existing stack. Baseline and planner policy parameters must be visible, versioned assumptions rather than hidden medical rules.

User review requested: approve or revise this software-only scope and the proposed workflow before implementation. No hardware, clinician access, efficacy or additional user preferences have been assumed as agreed.
