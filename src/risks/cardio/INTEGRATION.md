# Handoff to the navigation/vector owner

## Four-module replay review — 2026-11-15

Reviewed the registered Cardio, Sleep, Bone and Immune routes together. Each
research view identifies NASA research and research participants, keeps its own
selectors, and makes descriptive comparisons within that participant's source
series. Missing or conflicting evidence never becomes a simulated measurement.

| Module | Frozen research scope | Source audit |
| --- | --- | --- |
| Cardio | MR080G, C3D-3985; two pre-tests, post-bed-rest and recovery | All 12 stage HR/RPE/workload/duration values and eight unit-specific peak representations match their physical raw CSV rows. |
| Sleep | BRSMAct, Campaign 1; 3 participants, 207 nights | Raw rows and all 3 file hashes match; curation reproduces identical bytes, including query conflicts and missing baselines. |
| Bone | MR035G, Campaign 3; 7 participants, 285 curated source rows | All curated rows and 302 downloaded file hashes match; the selected 20-file artifact reproduces identical bytes. This remains an explicit subset. |
| Immune | OSD-575, HD71 serum; 4 participants, 71 markers, 28 samples | All 1,988 submitted concentrations agree with the transformed representation; source rows and 9 hashes match; curation reproduces identical bytes. |

Fixed Cardio's VO2peak chart shrinking into unreadable text at 320 px by keeping
its SVG at a readable width inside the existing focusable scroll container.
Aligned its badge to **NASA research replay** and made the read-only separation
explicit. The failing mobile scrolling check passed after this CSS fix.

Added `research-browser.mjs` as a repeatable check using installed Chrome:

```sh
node src/risks/cardio/research-browser.mjs http://127.0.0.1:4174 --dev
node src/risks/cardio/research-browser.mjs http://127.0.0.1:4175
```

Start a dev server at the first address and a production preview of `npm run
build` at the second, or substitute the actual addresses. The script uses fresh
browser state, saves simulated observations through the real registered UI, and
blocks every external request while allowing local app assets. It visits every
research participant/observation/region/marker/sample option, exercises both
Cardio units and source-packet downloads, checks missing/conflicting evidence,
and verifies source labels, expanded provenance, reloads and 320 px scrolling.
Desktop and mobile checks passed in both development and production previews.

The dev audit compares all three simulated crew members' real vectors, latest
signals, private histories, selected observations and evaluations before/after
research interactions. They remain identical, as does local storage; each
unsaved crew draft survives switching back. Immune retains the saved **80%**
hives result, then separately preserves a decoded local photo and unsaved itch
selection through another lab-view round trip. The production audit checks
storage, displayed results, drafts and photos; it does not import dev modules.
Neither run reported a browser page error. Other browsers and a disconnected
service-worker installation were not tested.

Final checks: 451 tests passed, one existing test skipped; `npx tsc -b`,
`npm run lint`, `npm run build` and `git diff --check` passed. Vite retains its
existing large-chunk warning. No shared shell/vector files or research values
were changed during this review.

## Integrated NASA Cardio workflow

Cardio now includes a visible **NASA research** source selector above the crew
form. It loads the bundled MR080G C3D-3985 post-bed-rest test immediately, with
selectors for recovery, recorded workload and VO2peak units. HR comparisons use
the existing `compareSession` with `research-descriptive-v1`; peak retention uses
the same `adaptVo2` / `assess` evaluator as crew reports. Both charts and a source
packet download appear in Cardio, without navigating to the evidence page.

The post-bed-rest 100 W comparison is +41.5 bpm; relative VO2peak retention is
73.9%. Recovery is +14.5 bpm and 98.0% retained. Exercise stages and peak reports
remain separately identified archival observations. The historical test stop is
shown as archival context, not emitted as a current crew red flag. This read-only
research mode does not emit timed vector signals, register a research participant
as simulated crew, write the exercise archive or alter crew baselines. The crew
form remains mounted so switching modes preserves an unsaved draft.

Browser verification in headless Chrome covered the real registered Cardio
route, test/workload/unit selections, chart rendering, JSON packet provenance,
unchanged local storage, returning to the preserved crew draft and a 320 px
layout with expanded sources and no page overflow. Controls and export also
worked after disabling network access in the loaded app.

The original handoff below describes the earlier tab implementation.

Only `src/risks/cardio`, `sleep`, `immune` and `bone` were changed.
Each `index.ts` exports `riskTab` with the exact five-field shared descriptor.
Mount `riskTab.Component` with `{ crewId, vector }`; evaluators reject unknown IDs.
No vector implementation, shared type, shell registration or existing exercise file
was edited. The root app does not yet advertise these tabs.

## Public boundaries

- Components subscribe to their injected `VectorApi` and private input saves.
- Raw tab state is session-local and isolated by API instance and crew ID. A new
  vector instance also resets unsaved component drafts. No automatic demo fallback.
- `model.ts` in each folder exposes the tab's typed input, calculation, save and
  evaluation functions. Saves emit a complete base snapshot; evaluation is read-only.
- Signal rejection rolls back the new private observation. Corrections require a
  later timestamp; historical imports do not displace a later saved snapshot.
- Navigation links retain `crewId` and `at` in `#/risk/<risk>?crewId=...&at=...`.
  The `microg:risk-navigation` CustomEvent also supplies `{ risk, crewId, recordedAt }`.
  Map these to the shell's eventual routes without dropping observation context.
- PMC actions queue frozen local request packets in separate scoped `microg.pmc.*`
  keys. They download JSON, including raw observations and provenance, and explicitly
  say **not transmitted**. Connect an actual mission request channel separately.
  Corrupt queues are preserved; the current packet remains downloadable in memory.

## Cardio identity and time

`cardioIdentity` defines explicit adapter registration IDs:

| Source              | ID                                                         |
| ------------------- | ---------------------------------------------------------- |
| Simulated exercise  | `SIM-<subject>:<series>` (existing `SIM-` prefix retained) |
| Simulated VO2       | `<SIM-subject>:<comparisonGroupId or default>`             |
| NASA exercise/VO2   | `RESEARCH:MR080G:<subject>:<series>`                       |
| User-entered report | `USER:<subject>:<comparisonGroupId>`                       |

Examples: the existing complete exercise fixture is `SIM-DEMO-CREW:complete`;
the existing VO2 fixture is `SIM-CREW-01:default`. Neither maps to SIM-CDR.
Register each identity/source/series explicitly. Date-only exercise and VO2 data
remain visible in the wrapper, but emit no timed measurement unless its exact
observation timestamp is documented and equals the signal snapshot time.
The original NASA replay remains reachable through the existing source-aware route.
The existing exercise comparator, planner, assessment evaluator, charts and export
are reused; the wrapper never writes the existing exercise localStorage key.

## Fixtures and limits

- Fix the demo vector clock at `2026-11-14T11:00:00.000Z`. Sample inputs preserve
  their dates; they are not moved onto the current day.
- For Immune, register SIM-CDR and emit the reviewed Food fixture from the
  battleplan before saving `immuneSample()`. The tab emits **60**, calls
  `personalise` once and displays the vector's **80** plus sourced reasons.
  It never implements the allergy/food weights itself. A different selected
  historical snapshot does not receive adjustments from current exposures.
- `sleepSample()` supplies three complete aligned windows, 5.5/6/6 h, with
  fictional planned sleep/duty overlays. Debt is **6.5 h**. An unknown baseline
  midpoint remains unknown; the personal-baseline envelope stays null without a
  supported `sleepHours` entry matching the configured comparison series and
  `sleep-manual-v1` or `sleep-wearable-v1` method.
- `boneSample()` uses a 30-day date-only DXA interval with a BMD chosen to yield
  **−1.2%/month**, and **70%** recorded resistance volume. It does not invent
  nutrient totals. Baseline and current medical-team scans must have matching
  site, side, scan region, scanner and protocol. Do not infer those details from
  an opaque vector BMD `methodId`; vector-owner baseline integration must preserve
  that mapping and provenance when preloading the private scan form.
- Personal observed ranges are explicit private configuration. Raw cross-tab
  context alone does not prove an explanation or suppress persistent-change
  escalation; only the documented immune personalisation returns weighted reasons.
- No photo classifier, imported reference dataset, working wearable integration,
  or external PMC transmission is claimed. Photo decoding and wearable-JSON
  interval validation are implemented; images never enter shared signals.

## Verification

Unit/integration tests exercise the actual save-to-emit boundary and descriptor
rendering, including urgent suppression, source/crew isolation, nulls and zeros,
baseline gates, windows, units, conflicts and packet preparation. The existing
regression suite, lint and TypeScript/Vite build are run separately.

Browser checks use a temporary isolated harness with the actual descriptors and
an explicitly labelled injected vector double. They cover person selection,
save → emitted signals → updated results, decoded/invalid local photos, all
urgent banners, local medical packets and 320 px layouts. This is **not** an
end-to-end verification of the real vector and shell registration; those remain
the integration owner's check after wiring the descriptors.
