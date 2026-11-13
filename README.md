# MicroG Sentinel

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
