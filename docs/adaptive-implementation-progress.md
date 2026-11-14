# Adaptive exercise implementation ledger

Plan: docs/superpowers/plans/2026-11-14-adaptive-exercise-monitoring.md

Implemented sequentially in the main chat: stage contracts and runtime validation; separate four-occasion/twelve-stage NASA artifact; named synthetic scenarios; transactional CSV preview; source/context-aware comparison; exact subset observation planning; frozen baseline and append-only observation history; local persistence and recovery notices; retained scenario episodes; revision-checked acceptance; locally prepared JSON/readable-text reviews and manually recorded response; separate research route; default exercise route and legacy routes; modelled software-case evaluator; production browser journey and release documentation.

RED→GREEN observations recorded in the chat for NASA data, validation, CSV parsing, comparison, planner, persistence, review text and evaluation. Additional regressions exposed and fixed stale review-response acceptance and loss of prepared episodes during scenario switching.

Ruling: worktree creation failed with sandbox permission denial; continued on the existing shiwei/sweep feature checkout using the worktree skill's documented fallback. No commits or branch changes were made. Cost: changes are not isolated from other work in this checkout.

Ruling: combined episode lifecycle and persistence coordinator in src/exercise/store.ts instead of separate episodes/storage/hook files. Pure comparison, planner, input, evaluation and packet-text modules remain separate. Cost: coordinator needs focused review as the feature grows; it does not implement every interface name in the plan verbatim.

Ruling: scenario episodes are saved as immutable archived workspace snapshots, restored by scenario selection. CSV observations must belong to the active demonstration scope. Cost: this is a bounded demonstration workflow, not general medical-record management.

Remaining verification/limitations: unit coverage is representative, not every enumerated case in the plan. Exhaustive CSV fuzzing, accessibility compliance and independent clinical review are not established. Real user sessions, operational data integration and health/time-saving claims are pending. No plan checkbox is marked complete merely because its related feature exists.

Final verification: 76 unit tests, production build, lint and eight production browser checks passed. Final review also added a RED→GREEN regression preventing a future HR measurement from being offered as repair for missing baseline history. Screenshots were inspected; the research source badge was corrected. No independent review or clinical/user validation is claimed.
