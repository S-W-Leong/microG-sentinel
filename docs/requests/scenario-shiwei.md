# Mission day 100: Shi Wei loader request

Implement only `src/risks/{cardio,sleep,immune,bone}/`. Do not edit App, the shell, vector, or other tabs. No installs, commits, pushes or branch changes. Read `AGENTS.md` and the contract in `docs/battleplan.md`.

The shell already seeds every registered descriptor with an available loader, Food first for each crew. Add this optional field to each exported `riskTab`:

```ts
loadScenario?(context: RiskEvaluationContext): void;
```

Use the existing `saveCardio`, `saveSleep`, `saveImmune`, or `saveBone`, not direct vector emission or replacement stores. Each save must produce exactly the signals a user save produces. Reuse the tab's sample builders and extend them by crew. Import `scenarioStory`, `missionTime`, `missionStart`, `atDay` from `src/scenario/mission.ts`. `scenarioStory(context)` returns undefined for unknown, real/research or earlier-clock identities. Treat that as a no-op. Every fixture/result is **Simulated**, source `simulated-crew`.

Idempotence: skip inputs if the tab already has an observation at or after their timestamp. Save older-to-newer. A second call must neither throw, duplicate history, emit again, nor change the user's selection. Partial loads may resume only missing later inputs. Never overwrite existing inputs. Shell errors are caught per tab/crew. `http://localhost:5173/?scenario=off#/` starts without scenario inputs; no local storage is cleared.

## Fixed episode

Clock: `2026-11-14T11:00:00.000Z`. Inclusive mission day 100 starts from `2026-08-07` as day 1. No observation, photo, meal, baseline, or sleep interval may extend past the clock. Future planned schedules are not observations, but use completed intervals in this fixture to keep every timestamp at or before the clock.

| Crew | Traits already registered | Story |
|---|---|---|
| SIM-CDR | Shellfish allergy; morning; motion history 1 | Three short nights; mood 6,5,4,3,2 over five days, workload 9; shrimp rice at 08:00Z, hives at 11:00Z; seven high-sodium days; mild gut change and low fibre; SANS -0.5 lines; balance 1.0x. |
| SIM-PLT | No allergies; evening; motion history 3; declared one-carbon research flag | Stable sleep, meals, mood; SANS -1 line with next-PMC message; no current balance symptoms. |
| SIM-MS1 | Peanut allergy; intermediate; motion history 0 | No peanut or other allergen exposure in today's reviewed meals; five days at 70.8% of energy target, body mass 70 to 68.6 kg; slightly lower appetite and bone change. |

Food already supplies current sodium/calcium/vitamin D/energy/fibre through the vector. Read these; do not copy meal stores. CDR's current food snapshot is 10:00Z, the shellfish meal 08:00Z, and the latest immune observation must be 11:00Z. Sodium is context, not a cause or treatment recommendation. CDR radiation is 64 mSv over 100 days at 0.64 mSv/day; PLT 60 at 0.60; MS1 75 at 0.75. No risk tab needs to duplicate radiation.

## Sleep

Reuse `sleepSample()` and `saveSleep`. Three manual nights on November 12, 13, 14, each recorded at 11:00Z with an 00:00–08:00Z opportunity, no naps, complete=true, criticalTaskSleep=false. Planned intervals match the opportunity; omit duty or use a completed prior duty interval. Set `comparisonGroupId = crewId + '-MISSION-01'` and `baselineMidpointHourUtc=4`. The shell's scenario registrations already provide an 8 h supported `sleep-manual-v1`, default-context baseline dated October 25.

| Crew | Sleep hours oldest to newest | Latency minutes | Awake minutes oldest to newest | KSS | Fatigue | Expected debt |
|---|---|---|---|---|---|---|
| SIM-CDR | 5.5, 6, 6 | 30 | 120, 90, 90 | 7 | 5 | 6.5 h |
| SIM-PLT | 8, 8, 8 | 0 | 0, 0, 0 | 2 | 2 | 0 h |
| SIM-MS1 | 7.5, 8, 7.5 | 0 | 30, 0, 30 | 3 | 3 | 1 h |

Do not infer wearable stages from these manual totals. Optional absent sensor fields remain null. Expected latest personal-baseline changes: CDR -2 h, PLT 0 h, MS1 -0.5 h. Test the emitted debt and Mood's vector-read sleep context, crew isolation, and repeated-load idempotence.

## Immune

Reuse `immuneSample()` and `saveImmune`; all records at 11:00Z. All four red flags false. The similarity is the existing illustrative rule, never image inference or diagnosis.

| Field | SIM-CDR | SIM-PLT | SIM-MS1 |
|---|---|---|---|
| rashActive | true | false | false |
| whealCountBand / itch | 2 / 2 | 0 / 0 | 0 / 0 |
| raised / clearEdges / paleCentre | true / true / true | false / false / false | false / false / false |
| fadesWithin24h | null (not yet known) | false | false |
| areas | trunk, left-arm | [] | [] |
| onset | 2026-11-14T10:30:00.000Z | null | null |
| photoTime / photoArea | 2026-11-14T11:00:00.000Z / left-arm | null / null | null / null |
| base / personalised match | 60% / 80% | 0% / 0% | 0% / 0% |

Use the existing labelled synthetic placeholder, not an external photo or a claimed model classification. Keep no-pattern escalation for the 0% observations if the current evaluator produces it; do not bypass normal rules to label a crew member healthy. CDR's three matching groups give 60%, while Food + declared allergy adds 20 points exactly once. MS1 must have no adjustment or reasons despite the peanut allergy. Test all three through the real vector. `src/scenario/scenario.test.ts` already includes a conditional integration test for CDR=80%; it automatically runs when the immune descriptor gains its loader.

## Bone

Reuse `boneSample()` and `saveBone`. Record at 11:00Z; total-hip, left side, same scanner/protocol/region in both scans. Baseline 2026-10-15, 1.0 g/cm²; current 2026-11-14, `1 + (monthlyChangePct / 100) * 30 / 30.4375`. No sudden pain. Personal illustrative targets: sodium 2300 mg, calcium 1000 mg, vitamin D 600 IU.

| Crew | Monthly BMD change | Planned sets/reps/kg | Performed sets/reps/kg | Resistance load |
|---|---|---|---|---|
| SIM-CDR | -1.2%/month | 2 / 10 / 50 | 2 / 10 / 35 | 70% |
| SIM-PLT | 0%/month | 2 / 10 / 50 | 2 / 10 / 50 | 100% |
| SIM-MS1 | -0.4%/month | 2 / 10 / 50 | 2 / 10 / 45 | 90% |

Use the November 13 resistance entry, complete=true, separately named simulated exercise/device IDs by crew. Mission start is `2026-08-07T00:00:00.000Z`; the current Bone calculator reports **99 completed elapsed days**, which is consistent with **inclusive mission day 100**. Keep those meanings distinct rather than changing arithmetic or shifting the launch date. Tests should verify both meanings, three BMD/load values, exact Food context via the vector, and idempotence. DXA is a fictional entered record, not a claim of an operational ISS DXA scanner.

## Cardiovascular

Reuse the existing exercise workspace comparator and complete synthetic scenario as a private fixture. Do not change the persisted legacy exercise workspace or relabel research data. Clone the complete dataset, giving every session, stage, baseline-session reference and active-session reference crew-specific IDs. Use supported same-protocol 50/100/150 W seated stages, 180 s each; at 100 W the two baseline HR readings are 125 and 126 bpm (mean 125.5). Baseline sessions dated November 10 and 11, current session November 14. No symptoms, all red flags false, no missing readings. The existing `cardioIdentity` always appends `:seriesId`, so it cannot currently resolve the shell's bare SIM-CDR/PLT/MS1 IDs. Add a narrowly scoped mapping in your adapter for exactly these three simulated pairs: `subjectId=crewId`, `seriesId=crewId + "-MISSION-01"`. Map those pairs to the bare crewId and retain the existing mapping for every other source/series. Update every session scope consistently, assert the mapped identity equals context.crewId, and test that a wrong crew or series is still rejected. Do not use substring matching or drop series checks globally.

| Crew | Current 100 W HR | Change vs mean | Borg | Resting seated HR | Completed/planned minutes |
|---|---|---|---|---|---|
| SIM-CDR | 166.5 bpm | +41 bpm | 14 | 68 bpm | 48 / 60 |
| SIM-PLT | 127.5 bpm | +2 bpm | 11 | 60 bpm | 60 / 60 |
| SIM-MS1 | 133.5 bpm | +8 bpm | 12 | 65 bpm | 54 / 60 |

Record at 09:30Z and set exerciseObservedAt to exactly that documented time so exercise signals actually emit. Source session date must be November 14. Select the 100 W stage, view=exercise, exerciseWindowComplete=true. Use sensible adjacent stages (e.g. baseline HR + the same crew delta at 50/150 W) while retaining workload labels.

If also loading VO2peak, provide separate explicitly simulated same-person baseline/current reports with all required metadata and actual documented dates/times; otherwise leave it null. Do not fabricate contemporaneous VO2 from an older date-only report to fill a field. The required home-card comparison is the HR change. Test save-to-emit deltas for all three, identities, no legacy persistence writes, and repeated-load idempotence.

## Verification and ownership handoff

Run `npx.cmd vitest run src`, `npx.cmd tsc -b`, `npx.cmd eslint .`, `npx.cmd vite build`. Open the actual app with a fresh browser context: all nine tabs should show their own saved observations immediately; switch all three crews; CDR immune must show 80% with the two reasons, MS1 none. Check `?scenario=off` still opens clean. Report remaining unavailable metrics honestly.

App/header owner: `src/App.tsx` contains the old “Simulated fixture time” label. Replace it with a small “Mission day 100” label and retain Simulated. The scenario worker did not touch that protected file; BodyMapHome's Demo path disclosure is already removed. Avoid duplicating the mission-day label if placing it in the header (the body map currently includes one).
