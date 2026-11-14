# MicroG Sentinel

The default experience is a **four-screen interactive exercise walkthrough**: select a cycling workload to explore its readings, try a synthetic follow-up, inspect the original and follow-up side by side, then prepare and download a review. Back/Next controls and a step navigation show one task at a time. Each step has its own URL, so refresh and browser history retain your place. The **My values** navigation link opens instructions and the entry form for your own existing VO₂ reports. **NASA evidence** opens the separate research replay.

To compare your own results, save an earlier report with **Baseline record** ticked, then save a later report with it unticked. Keep the participant identifier, assessment series, metric and units consistent. The app brings the explained comparison into view after saving the later report. Use **Evidence & follow-up** to export before refreshing or closing the tab.

See [exercise demonstration](docs/exercise-demo.md), [CSV format](docs/exercise-import.md), [evaluation limits](docs/exercise-evaluation.md) and [implementation ledger](docs/adaptive-implementation-progress.md). Exercise work persists in browser storage; the older user-entered VO₂ form remains session-only. Reset clears the exercise demonstration key.

## Flight Deck interface

The exercise workspace uses the selected black, off-white and signal-orange Flight Deck design. The active step is highlighted; choosing a workload updates a focused baseline/current reading pair and explanation. Capturing a follow-up opens the comparison screen automatically. The original missing value stays visible beside the new observation. The chart, schedule switches, comparison details and demonstration inputs are optional disclosures. Available-workout switches recompute the actual plan. Missing measurements never become plotted numeric values. Review preparation includes a readable snapshot and a stale-evidence indicator, alongside the existing exports and response workflow.

NASA evidence, the body map, formal VO₂ assessments and user-entered assessments remain separate and accessible. The comparison, planner, store, CSV and source-data contracts are unchanged. See [visual verification](design-qa.md) and [the implementation plan](docs/superpowers/plans/2026-11-14-flight-deck-overhaul.md).

Interface resources: [IBM Plex](https://github.com/IBM/plex) fonts are bundled locally through [Fontsource](https://fontsource.org/); icons use [Phosphor](https://phosphoricons.com/); exercise graphics use [Observable Plot](https://observablehq.com/plot/). Their code and font licences remain in the installed packages. The selected visual reference and verification captures are in `artifacts/flight-deck/`.

## Existing assessment tools

MicroG Sentinel is a NASA Space Apps 2026 hackathon prototype that helps an astronaut review an existing aerobic fitness (VO2) assessment against a personal baseline, inspect the comparison evidence, and export a review card. Built with Vite 6, React 19, and TypeScript, it runs offline with no backend: simulated crew assessments demonstrate the astronaut workflow, while a separately labelled NASA bed-rest analog research replay shows measured change and unresolved source conflicts.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
```

Open the local URL printed by Vite. `npm test` runs the data and assessment checks; `npm run build` produces `dist/`. The bundled workflow needs no network connection after installation. External NASA links require internet access.

Use `npm run lint` for code checks and `npm run format` to format `src/` with Prettier. `.prettierignore` preserves the shared contract and Developer A-owned logic and data files.

## Project structure and team split

| Path | Purpose / owner |
| --- | --- |
| `src/types.ts` | Shared input/output contract; coordinate changes between both developers |
| `src/logic/` | Assessment validation, baseline selection, calculations and trends; Developer A |
| `src/data/` | Bundled simulated crew records and typed NASA replay projection; Developer A |
| `src/ui/dataSource.ts` | Bridge between screens and real assessment logic/data; all screen data comes through here |
| `src/screens/` | My Fitness, Understand, and Evidence views; Developer B |
| `src/components/` | Body map, assessment card, status and trend chart; Developer B |
| `data/raw/` | Untouched NASA download |
| `data/curated/` | Frozen replay subset, mappings, provenance and unresolved issues; Developer A |

Developer A owns logic and data. Developer B owns the interface and explanations, consuming the shared contract through the data bridge.

## Data sources and research replay

Crew assessments are simulated for demonstration. Research participants are not astronauts. The NASA replay uses **NASA Life Sciences Data Archive / NASA Life Sciences Portal, MR080G, UTMB Flight Analog Project, Campaign 3, Physical Fitness Evaluation - Cycle Ergometry**. [Dataset page](https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS). The subset was curated from the supplied download on 2026-11-14; the portal was not re-fetched. See [curation notes](data/curated/README.md) for raw filenames, field mappings, conflicts and arithmetic. Evidence views and JSON exports preserve source notes and include this citation for replay records.

Open **My Fitness → Research replay** for four examples:

- **C3D-3985:** immediate post-bed-rest measured decrease (73.9% retained) and recovery (98.0%). The mass-normalized baseline is the arithmetic mean of two pre-tests, 29.9 mL/kg/min.
- **C3A-0224:** conflicting campaign and participant fields; comparison needs review.
- **C3G-5580:** conflicting dates in linked source representations; comparison needs review.

The header demo link and Evidence replay link open C3D-3985's immediate post-bed-rest assessment. Its chart separates measurement units and shows baseline records, decline and recovery. The 80% line is shown for context only; research records receive no determination.

## Limitations

This is not a clinical tool and provides no clinical clearance, mission determination, exercise prescription or changes to exercise intensity, frequency or duration. Evidence status describes comparability, not clinical adjudication. Research records receive no compliance determination. NASA-STD-3001 V1 requirement 4003 concerns in-mission aerobic capacity relative to pre-mission capacity; it cannot establish compliance for a bed-rest participant or task-specific EVA capability. The baseline averaging rule is an explicit demonstration assumption, not a NASA-approved rule. VO2peak and VO2max remain distinct, absolute and mass-normalized values stay separate, and missing or conflicting evidence is not treated as zero. Other body-map modules are planned only. See [the project brief](docs/brief.md).

## AI tools used

Claude was used for orchestration and review. OpenAI Codex was used for implementation workers. This disclosure is included for NASA Space Apps transparency requirements; AI assistance does not establish clinical validity or resolve source-data conflicts.

## User-entered assessments

My Fitness supports transcribing an existing assessment, adding baseline records, correcting your entries and exporting review JSON. Enter a participant identifier and assessment series to keep contexts separate. Real entries remain in tab memory only: refresh/close clears them. Export before leaving if you need a copy. User entries are labelled separately from simulated crew and NASA research; their reference is context only and no operational or clinical determination is issued.

Browser acceptance: `npx playwright install chromium`, `npm run build`, then `npm run test:e2e`. See `docs/verification.md`, `docs/usability.md` and `docs/submission.md` for release evidence and remaining human work.
