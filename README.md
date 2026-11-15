# MicroG Sentinel

An offline crew health app for astronauts, built for NASA Space Apps 2026 (Kuala Lumpur) by team (SW)²: Siang Woo and Shi Wei.

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
| Head | Balance | Sensorimotor and vestibular change | Live |
| Gut | Microbiome | Host–microorganism interactions | Live |
| Eyes | SANS | Spaceflight-associated neuro-ocular syndrome | Live |
| Head | Mood | Behavioural health (optional) | Live |

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

**Cardio** keeps the exercise heart-rate check and the NASA bed-rest replay (participant C3D-3985: VO₂peak 73.9% of baseline after bed rest, 98.0% after recovery; +41.5 bpm at 100 W). Each of Shi Wei's tabs (Cardio, Sleep, Immune, Bone) has a **NASA replay** toggle beside the crew check-in.

## How it's built

React 19, TypeScript and Vite. No backend. Data for the demo is simulated crew data plus a curated NASA research subset.

| Path | What it is |
|---|---|
| `src/shell/` | Body map home, routing (`#/risk/<risk>?crewId=`), crew picker |
| `src/risks/<risk>/` | One folder per risk tab; each exports a `riskTab` descriptor |
| `src/risks/types.ts` | Shared contract: signals, vector API, evaluation, escalation |
| `src/vector/` | Astronaut vector: crew registry, signal store, exposures, personalisation |
| `src/screens/`, `src/exercise/`, `src/logic/` | Cardio exercise monitoring, NASA replay and VO₂ assessment routes |
| `data/raw/`, `data/curated/` | Untouched NASA download and the curated, cited subset |
| `design/astronaut-3d-v2/` | Approved 3D body map prototype source; the app uses `src/shell/astronaut3d/` |
| `docs/battleplan.md` | Team plan, every tab's spec and the full contract |
| `docs/exercise-import.md`, `docs/exercise-evaluation.md` | Cardio CSV import rules and software-case evaluation limits |
| `docs/source-claims.md` | Source sections supporting the Cardio assessment context |

Coding agents: read [`AGENTS.md`](AGENTS.md).

## Challenge resources and how we used them

| Resource | How it shaped the app |
|---|---|
| [NASA: 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | The body map is organised around them. Altered gravity → Bone, Balance, SANS, Cardio. Isolation and confinement → Mood, Sleep. Hostile, closed environment → Immune, Microbiome, Food. Radiation → the radiation dose card. Distance from Earth → every red flag hands off to the flight surgeon. |
| [NASA: Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) | Each tab is one of NASA's named risks (8 of the 17, plus radiation as context). Risks that are not personal readings (for example decompression sickness, hypoxia, landing injury) are left out on purpose. |
| [NASA: Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/) | ARCHeR tracks well-being, activity and sleep on Artemis II, the model for our Sleep, Mood and Balance check-ins. Standard Measures collects the same measures from every crew member, the model for our per-person baselines. Tempus Pro sends crew health data to ground doctors, the model for our flight-surgeon review packet. |
| [CSA: Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | The radiation card shows mission dose against NASA's 600 mSv career limit and the neutron share measured by CSA's CANS detector (about 30% of ISS radiation). Dose values in the demo are simulated. |
| [CSA: Why Do We Conduct Science Experiments in Space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Why we build on research data: our real numbers come from NASA's MR080G bed-rest study, a ground analog for spaceflight deconditioning, and they are kept separate from crew data. |

## Data sources

- **NASA MR080G** (real, bundled): NASA Life Sciences Data Archive / NASA Life Sciences Portal, UTMB Flight Analog Project, Campaign 3, Physical Fitness Evaluation, Cycle Ergometry. [Dataset page](https://nlsp.nasa.gov/search/data/details/852cd84a-464d-572b-99ac-9555f4dda464?dataType=DATASETS). Curated from the supplied download on 2026-11-14; see [curation notes](data/curated/README.md). Research participants are not astronauts.
- **Reference datasets** for the other tabs, cited in the battleplan: Sleep-EDF (PhysioNet), Google SCIN skin images, NHANES DXA, Human Balance Evaluation Database, NASA OSDR ISS microbial studies, USDA FoodData Central. The demo uses simulated crew data and does not claim analysis of these datasets.
- **Clinical screening scores** used as "pattern for follow-up" context (for example UAS7, PSQI, MISC, MUST): see "Indicative clinical scores" in [the battleplan](docs/battleplan.md).

## Limitations

A hackathon prototype, not a clinical tool. It gives no diagnosis, clearance, treatment or exercise prescription. Personalisation weights are documented demo assumptions, not trained or validated. Screening thresholds come from Earth populations, not astronauts. Simulated data is always labelled. The NASA-STD-3001 80% reference applies to in-mission crew only; research records get no determination. VO₂peak and VO₂max stay distinct, and missing values are never treated as zero.

## AI tools used

We used AI tools (Claude, OpenAI Codex, DeepSeek) for four kinds of work:

- **Research:** finding datasets, clinical screening scores and NASA background.
- **Data analysis:** curating the NASA datasets for the replays (see `data/curated/` and each tab's `research/` folder), checked against the source files.
- **Coding:** Codex wrote most of the code under Claude's review, including the three.js body map and the scripts that build the slides. An early DeepSeek 3D prototype was not used.
- **Writing:** this README, the docs and the slide text.

No images, video or audio were AI-generated: the 3D astronaut is drawn by code, and the slide images are screenshots of the app. The app itself contains no AI model. This disclosure follows NASA Space Apps requirements; AI assistance does not establish clinical validity.

Interface resources: [IBM Plex](https://github.com/IBM/plex) fonts via [Fontsource](https://fontsource.org/), [Phosphor](https://phosphoricons.com/) icons, [Observable Plot](https://observablehq.com/plot/) charts, [three.js](https://threejs.org/) (MIT) for 3D.
