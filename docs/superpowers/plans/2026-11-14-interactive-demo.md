# Interactive guided demo

Replace the long exercise page with four URL-addressable steps: read, plan, compare, review. Keep the existing offline exercise store and all original data. Default and unknown step routes open read. Browser history and refresh retain the active URL step. A compact progress navigation and Back/Continue actions replace anchor jumps.

Read: select a cycling workload to view one baseline/current pair, units and a plain-language explanation. Plan: use existing acceptance, schedule and synthetic capture operations. Successful capture opens compare. Review bypass opens review without claiming collection occurred. Compare: show original and currently linked observations side by side against the unchanged baseline; missing and incompatible values retain their semantics. Review: existing prepare/export and stale-review behavior, plus a route to personal data entry.

Keep scenario, CSV and history tools in a single optional disclosure, outside the main step content. Do not reset stored user work during verification. Use existing typography, colors and icons. No new dependencies or clinical interpretations.

Implementation: add tested presentation helpers for step parsing and original/current reading pairs; add an interactive reading explorer and before/after view; conditionally mount one existing workflow section per URL step; add responsive step navigation and back/next controls; update browser acceptance paths. Verify original vs follow-up values, missing and incompatible data, direct links, refresh/back navigation, symptom bypass, exports, stale review and mobile layout. Run unit tests, build and lint, then exercise the actual flow in the in-app browser.
