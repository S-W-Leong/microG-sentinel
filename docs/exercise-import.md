# Exercise demonstration CSV

The Cardio tab links to the exercise monitoring workspace at `#/exercise`. Its demonstration import follows these rules.

The import disclosure provides the exact CSV header. Fields use watts, seconds and bpm; RPE uses the Borg 6–20 scale. Use the currently displayed DEMO-CREW participant and active scenario series. This release accepts demonstration data only, not personal medical records or arbitrary wearable exports.

Blank measurements remain missing. Booleans are `true` or `false`; posture is `seated`, `supine` or blank; quality is `usable`, `unusable` or `unknown` with a documented basis. Use new immutable session/stage identifiers. Repeated session metadata must agree. Quoted commas/newlines, escaped quotes, BOM and CRLF are supported. Maximum: 1 MiB and 2,000 rows. Any rejected row disables the entire import; correct the file before committing.

After commit, explicitly select its follow-up in “Link imported follow-up.” The frozen baseline remains unchanged. Unknown historical context cannot be repaired by a future measurement. Source notes remain literal text and imports never acquire NASA provenance.
