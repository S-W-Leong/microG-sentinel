# NASA actigraphy replay

## Design and scope

Requested: inspect NASA actigraphy data and integrate a real Sleep replay separate
from simulated crew. Use a read-only view inside Sleep with its own participant and
observation selectors. It never saves to the crew store, emits vector signals,
or invents observation timestamps. Existing check-ins retain their state.

Approaches: forcing date-only summaries into wearable intervals would invent data;
registering research subjects in the crew vector would require changes outside
Sleep ownership. A private, read-only research view fits the requested isolation.
Work stays on the project-required `unslop/flight-deck` branch, within Sleep.

## Provenance

Retrieved 2026-11-15 from NASA Life Sciences Portal, BRSMAct, UTMB Campaign 1:
https://nlsp.nasa.gov/search/data/details/e26501eb-7d7a-5012-8c8e-c5bdb3eecaf6?dataType=DATASETS

Files under `raw/` are byte-for-byte downloads, including spelling and BOMs.
Download prefix: `https://nlsp.nasa.gov/api/v1/files/`, suffix: `/download`.

| File                                           | Download ID                          |
| ---------------------------------------------- | ------------------------------------ |
| BRSMACT_Campagin_1_Actigraphy.csv              | 972badfb-238d-5dd5-81f2-8efc729a4452 |
| BRSMACT_Campagin_1_Actigraphy_Query_Result.csv | e4630225-a050-54fb-be99-795cf1053654 |
| BRSMACT_Campaign_1_Actigraphy_ReadMe.txt       | ba27dc5f-962a-5af8-a232-0b8bef1e4748 |

Catalog availability is “Available online”; this is attribution to a NASA public
research release, not a claim of a separately verified blanket reuse licence.
The ReadMe defines duration/latency as HH:mm, not decimal hours. Main duration
values add seconds. Zero latency is a measured zero. NA stays null.

The main export has 207 rows: 69 per participant, including two PRE_TEST,
60 IN_TEST and seven POST_TEST entries. There are 17 rows with missing metrics.
C1G0002 and C1G0003 have missing pre-test measurements. The query export has 191
rows, including multiple records for some participant/date/phase/day keys.
It is additional source evidence, not 191 independent additional nights.
Query row 88 has duration `6.56`, which is malformed under the ReadMe's HH:mm
format; it is retained raw, never guessed or corrected.

The replay shows the main export's measurements. All matching query rows are
retained as provenance. Known unequal metrics or malformed matching query values
flag that observation as conflicting; missing main values are never backfilled.
Dates and phases must agree with their declared bed-rest day; conflicting timing
also suppresses comparisons. Source notes (including recorded medication context)
are historical observations, never recommendations.

Baseline: arithmetic mean of the same participant's two complete, unconflicted
PRE_TEST nights, only for later observations. This is a local demonstration
assumption, not a NASA-approved baseline rule. Conflicting/missing included
baseline rows block the comparison; never drop one to rescue a baseline.
Display duration difference in minutes and efficiency difference in percentage
points. No sleep stages, clinical categories, circadian phase, complete 24-hour
coverage, naps, sleep debt, KSS or fatigue are inferred from these summaries.

## Implementation plan

1. Freeze the three raw files, inspect missing values and cross-export conflicts.
2. Generate a deterministic JSON artifact with file hashes, physical CSV row
   provenance, nulls, parsed units and matching query representations.
3. Test unit conversion, baseline gates, conflicts and participant separation;
   implement a pure comparator and a read-only research component.
4. Add an explicit Crew check-in / NASA replay switch outside the crew frame.
   Keep the mounted crew panel hidden while research is open to preserve drafts.
5. Run tests, TypeScript, lint and build, then verify the registered Sleep route
   in a real browser at desktop and 320 px, with external requests blocked.

Regenerate: `python3 src/risks/sleep/research/curate.py`.
The generated manifest records SHA-256 for all source files.

## Verification (2026-11-15)

- Final `npm test`: 39 files passed, 437 tests passed, one existing test skipped
  (includes concurrent Cardio work, which this change did not edit).
- `npx tsc -b`, `npm run lint`, `npm run build`: passed. Vite still reports
  chunks above its 500 kB warning threshold.
- Regenerating the artifact produces identical bytes; all three manifest hashes
  match the downloaded raw files.
- Real installed Chrome, actual registered Sleep route and real vector: toggled
  sources, selected all participants and observations, inspected missing baseline
  and malformed/conflicting source evidence. Crew vector, latest sleep signals
  and private history remained identical; the unsaved latency draft survived.
- Production preview in Chrome: replay loads/reloads with external requests
  blocked; all participants, source evidence and comparisons work. At 320 px,
  including expanded provenance, no document overflow; the chart scrolls within
  its own labelled keyboard-focusable container. No browser page errors.
- No claim of wearable-device testing, clinical validation, browser coverage
  beyond Chrome, or fully disconnected service-worker installation.

Review: changes stay entirely under `src/risks/sleep/`; research has no vector
or crew-store mutation path, the existing evaluator is unchanged, and no missing
pre-test values or malformed source assertions are silently repaired.
