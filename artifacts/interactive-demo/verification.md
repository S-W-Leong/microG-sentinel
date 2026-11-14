# Interactive demo verification

The long walkthrough is replaced by four route-based screens. Only the active step is mounted. Workload buttons update a focused reading pair; capture opens the original/follow-up comparison automatically. Back/Next and numbered links support navigation, with a sticky action footer on small screens. Optional settings are collapsed separately.

Verified in the in-app browser at 1280 × 900 and 390 × 844:

- Selected 100 W; the explorer showed the missing reading and explained that it was not zero.
- Accepted a follow-up plan, refreshed on the plan URL and confirmed acceptance survived.
- Generated a synthetic observation; the comparison opened with original 100 W missing, follow-up 145 bpm and unchanged baseline mean 125.5 bpm. Missing count changed from 1 to 0.
- Opened an earlier prepared review; it was marked stale. Updating produced a current JSON download.
- Selected the symptoms scenario; collection was bypassed and Continue to review opened the review screen.
- Returned to the original scenario without resetting stored work. Browser Back preserved the selected 100 W workload.
- Restored the original browser viewport after responsive checks.

Unit tests cover route fallback/deep links, no invented follow-up, original vs current observations and incompatible comparison withholding. All 90 unit tests pass. Production build and ESLint pass, with the existing Vite large-chunk warning. Playwright acceptance paths were updated for the new steps; the CLI suite was not run. Screenshot inspection and browser interactions do not establish full accessibility conformance.
