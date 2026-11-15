# Balance

Open Head → Balance for SIM-CDR, then **Load 2.1× sample**. The local synthetic fixture has 4.2 °² eyes-closed sway and a 2.0 °² personal baseline. Neither is NASA data. Switch between recorded eyes-open/closed traces. Set MISC to 6 and save to raise the next-PMC banner; any red-flag Yes immediately hides results and offers urgent contact. Request call / Request PMC prepares the existing local queue and downloadable packet, not a transmitted message.

**Run simulated replay** plays a full 30-second trace. **Start device test** requests supported sensor permissions and uses orientation or gravity-derived angles. Enter a stable physical-device ID; use portrait. After 1.5 seconds without finite paired samples, acquisition explicitly restarts as a simulated replay. Stop, visibility loss, or orientation change records an incomplete test. Leaving the tab removes listeners and timers. No samples are filled across gaps. Real device permissions and physical measurements still require hardware verification.

MISC is a separate local 0–10 indicative score (nausea threshold 6). The unchanged shared `BalanceSignals.motionSickness` remains a separate 0–20 rating. Saves emit all six shared keys, preserving nulls. Local history is scoped by crew and vector instance. The shell has a fixed demo clock, so new demo observations start one minute before it; edited snapshots at the same timestamp advance by 1 ms rather than overwrite the prior snapshot.

## Baselines

Production comparisons read vector baseline entries, not other tabs' private data. Match metric/condition, source, comparison group, `covariance-95-v1`, and `contextKey(test)`. The key records device, portrait orientation, posture, protocol, gravity and acquisition. Baselines must be supported, positive, earlier, have the correct units and unique contributing-session count. The explicit SIM-CDR replay fixture alone uses the local synthetic baseline; live acquisition cannot use it. Vector area-only baselines render as a labelled equivalent-area circle, not an invented measured shape.

Ellipse area uses sample covariance: π × 5.991 × √det(covariance). Angles unwrap before centring. A recorded area requires a complete 30-second test with at least three paired finite samples. Escalation covers red flags, conflicting baselines, insufficient groups after two check-ins, MISC ≥6, and three checks outside a supplied observed range. `observedClosedRange` is an optional model input; no range is invented from one scalar baseline. Evaluation is read-only.

## Checks

- `npx vitest run src/risks/balance`
- `node src/risks/balance/ui-check.mjs`: actual app route and real vector, headless Chrome, 320 px, reduced-motion preference, replay fixture, MISC, urgent suppression, local PMC queue and incomplete-test save. Does not verify physical sensor accuracy or a human's visual assessment.
- Shared acceptance: `npx vitest run src`, `npx tsc -b`, `npx eslint .`, `npx vite build`.

HBEDB is an ODC-By force-platform background reference; its measurements are not interchangeable with this angular tablet demonstration. Source link is available in the tab. No assets or data from HBEDB are bundled.
