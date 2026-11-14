# MicroG Sentinel

An offline crew health app for astronauts, built for NASA Space Apps 2026 (Kuala Lumpur) by team SW²: Siang Woo and Shi Wei.

> Your body changes in space. See what changed for you.

The astronaut opens a **body map**, taps a region, and lands in a tab for one spaceflight health risk. Each tab has its own input and display, compares results with that person's own baseline or a reference pattern, and says what to share with the flight surgeon. An **astronaut vector** (traits, baselines and recent exposures per crew member) links the tabs: for example, a shellfish meal logged in Food raises the hives pattern shown in Immune for a crew member with a known shellfish allergy.

Results are pattern matches or personal-baseline changes, never diagnoses. Red flags hand the crew member to the flight surgeon (private medical conference); the app gives no treatment advice.

## What's in the app

| Body map region | Tab | NASA risk | Status |
|---|---|---|---|
| Heart & lungs | Cardio | Reduced cardiorespiratory fitness; cardiovascular adaptations | Live (real NASA data) |
| Head | Sleep | Sleep loss and circadian desynchronisation | Live |
| Skin | Immune | Altered immune response | Live |
| Bones | Bone | Spaceflight-induced bone change | Live |
| Gut | Food | Inadequate nutrition | Live |
| Head | Balance | Sensorimotor and vestibular change | In progress |
| Gut | Microbiome | Host–microorganism interactions | In progress |
| Eyes | SANS | Spaceflight-associated neuro-ocular syndrome | In progress |
| Head | Mood | Behavioural health (optional) | Planned |

Every tab with no build shows **Planned** on the body map, with no values.

## Run it

```sh
npm install
npm run dev
```

Open the URL Vite prints. Everything runs offline after install; external NASA and dataset links need internet.

On Windows with Smart App Control, also run `npm install --no-save "rollup@npm:@rollup/wasm-node@4.68.3"` after installing, or the build is blocked.

Checks: `npm test`, `npm run lint`, `npm run build`. Browser tests: `npx playwright install chromium`, then `npm run test:e2e`.

## Demo: the core story

Crew member **SIM-CDR** (simulated) has a declared shellfish allergy. The demo clock is fixed at 14 Nov 2026, 11:00 UTC.

1. Body map → **Gut → Food** → **Load demo** → **Save**. Logs "Shrimp rice" three hours earlier.
2. Body map → **Skin → Immune** → **Load sample** → **Save**.
3. Immune shows **Hives pattern 80%**: a 60% base match from five hives metrics, plus +10 for the known allergy and +10 for the allergen eaten within six hours, each listed as a reason.
4. Answer a red-flag question with **Yes** (for example "Trouble breathing") to see the score replaced by **Contact the flight surgeon now**.

**Cardio** keeps the exercise heart-rate check and the NASA bed-rest replay (participant C3D-3985: VO₂peak 73.9% of baseline after bed rest, 98.0% after recovery; +41.5 bpm at 100 W). **NASA evidence** in the header opens the research replay.

## How it's built

React 19, TypeScript and Vite. No backend. Data for the demo is simulated crew data plus a curated NASA research subset.

| Path | What it is |
|---|---|
| `src/shell/` | Body map home, routing (`#/risk/<risk>?crewId=`), crew picker |
| `src/risks/<risk>/` | One folder per risk tab; each exports a `riskTab` descriptor |
| `src/risks/types.ts` | Shared contract: signals, vector API, evaluation, escalation |
| `src/vector/` | Astronaut vector: crew registry, signal store, exposures, personalisation |
| `src/exercise/`, `src/logic/` | Existing exercise and VO₂ logic, used by the Cardio tab |
| `data/raw/`, `data/curated/` | Untouched NASA download and the curated, cited subset |
| `design/` | Body map design options |
| `docs/battleplan.md` | Team plan, every tab's spec and the full contract |

Coding agents: read [`AGENTS.md`](AGENTS.md).

## Data sources

- **NASA MR080G** (real, bundled): NASA Life Sciences Data Archive / NASA Life Sciences Portal, UTMB Flight Analog Project, Campaign 3, Physical Fitness Evaluation, Cycle Ergometry. [Dataset page](https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS). Curated from the supplied download on 2026-11-14; see [curation notes](data/curated/README.md). Research participants are not astronauts.
- **Reference datasets** for the other tabs, cited in the battleplan: Sleep-EDF (PhysioNet), Google SCIN skin images, NHANES DXA, Human Balance Evaluation Database, NASA OSDR ISS microbial studies, USDA FoodData Central. The demo uses simulated crew data and does not claim analysis of these datasets.
- **Clinical screening scores** used as "pattern for follow-up" context (for example UAS7, PSQI, MISC, MUST): see "Indicative clinical scores" in [the battleplan](docs/battleplan.md).

## Limitations

A hackathon prototype, not a clinical tool. It gives no diagnosis, clearance, treatment or exercise prescription. Personalisation weights are documented demo assumptions, not trained or validated. Screening thresholds come from Earth populations, not astronauts. Simulated data is always labelled. The NASA-STD-3001 80% reference applies to in-mission crew only; research records get no determination. VO₂peak and VO₂max stay distinct, and missing values are never treated as zero.

## AI tools used

Claude orchestrated the work and reviewed it. OpenAI Codex built most of the code as implementation workers. DeepSeek was used to prototype the 3D body map. This disclosure follows NASA Space Apps transparency requirements; AI assistance does not establish clinical validity.

Interface resources: [IBM Plex](https://github.com/IBM/plex) fonts via [Fontsource](https://fontsource.org/), [Phosphor](https://phosphoricons.com/) icons, [Observable Plot](https://observablehq.com/plot/) charts, [three.js](https://threejs.org/) (MIT) for 3D.
