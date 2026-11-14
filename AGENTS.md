# AGENTS.md

MicroG Sentinel: offline crew health app for NASA Space Apps 2026 (KL). Body map home → one tab per spaceflight health risk → shared astronaut vector. Team SW²: Siang Woo (leads) and Shi Wei.

## Source of truth

`docs/battleplan.md` holds the product decisions, every risk tab's spec, and the TypeScript contract. Read it before building or changing any risk tab, the vector, or the body map; follow it over anything else, including older docs in `docs/`. Its "Agent instructions" section is the step list and definition of done for a tab.

## Ownership

Work only inside your owner's paths; for anything outside them, leave a precise request for the other owner.

| Owner | Paths |
|---|---|
| Shi Wei | `src/risks/cardio/`, `src/risks/sleep/`, `src/risks/immune/`, `src/risks/bone/`; existing `src/exercise/`, `src/logic/`, `src/components/exercise/` |
| Siang Woo | `src/vector/`, `src/risks/balance/`, `src/risks/microbiome/`, `src/risks/sans/`, `src/risks/food/`, `src/risks/mood/`, `src/shell/`, `src/App.tsx`, `design/`, docs |
| Both, by agreement | `src/risks/types.ts` (the contract; keep `docs/battleplan.md` in sync) |

Tabs talk to each other only through the vector API (`emitSignals`, `getExposures`, `getSignals`, `personalise`), never through another tab's modules.

## Product rules

- Results are a **pattern match** or a **change vs the person's own baseline**, with reasons. Phrase findings as observations ("Hives pattern 80%", "Near vision −0.5 lines vs baseline"); diagnosis, treatment, "healthy", "safe" and "cleared" wording stays out of the UI.
- Red flags in a tab set `escalation: urgent` ("Contact the flight surgeon now") and hide the score; unidentified problems set `next-pmc` ("Raise at your next PMC").
- Missing values stay `null`; zero means a measured zero.
- Simulated data is always labelled `Simulated`; NASA research participants are "research participants", never crew.
- UI text follows the battleplan's polish bar: headlines ≤ 6 words, labels ≤ 3, numbers first, orange only for the primary action or selection, works at 320 px. Explanations belong in slides, not the app.

## Git

- Branch: `unslop/flight-deck`. Pull before you start and before you push.
- Commit only files you own, with a clear message; push normal commits (no force-push, no history rewrites).
- `main` receives one PR before submission (Shi Wei approves).

## Commands and gotchas

Scripts are in `package.json` (`npm test`, `npm run build`, `npm run lint`, `npm run dev`).

- **Windows:** Smart App Control blocks Rollup's native binary. After any `npm install`/`npm ci`, run `npm install --no-save "rollup@npm:@rollup/wasm-node@4.68.3"`, or builds and tests fail with "Application Control policy has blocked this file". Don't commit the lockfile changes that install causes.
- The demo vector runs on a fixed clock (`2026-11-14T11:00:00.000Z`); create timestamps from `vector.getVector(crewId).exposures.asOf`, not wall time, or saves are rejected as future records.
- Done means: `npm test`, `npx tsc -b`, `npm run lint` and `npm run build` pass, and you say which checks ran in a real browser and which did not.
