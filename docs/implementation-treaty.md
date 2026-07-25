# Implementation Treaty

Status: canonical technical behavior for v1

This document defines the means required to preserve the product ends and principles. Framework and code-organization choices remain open unless they affect these behaviors.

## Locked decisions

- Target device: Google Pixel 6 in portrait orientation.
- Scheduled class: Tuesday, 7:00–8:00 PM in the device's local time zone.
- Hard close: 8:00 PM, regardless of actual start time or accumulated drift.
- Bilateral duration: per side. Four minutes means four minutes on each side.
- Advancement: always manual.
- Actual durations: derived from timestamped run events.
- Authoring source: versioned structured Markdown.
- Delivery: a small static HTTPS-hosted Progressive Web App, fully usable offline after installation.
- Storage: on-device; no account or cloud dependency.

## Delivery architecture

The app must be deployable as static assets. A typical bundle contains:

- Application HTML, CSS, and JavaScript
- `app.webmanifest`
- A same-origin service worker
- App icons
- Locally hosted Hanken Grotesk and Spectral font files

No production asset may depend on Google Fonts or another third-party network request. The service worker must precache the complete application shell, fonts, and icons.

The app must be served over HTTPS for installation, service-worker registration, persistent-storage requests, and wake-lock behavior. Localhost may be used during development.

The implementation may use a build tool, but the deployed result must remain a small static bundle. A build tool must not become a studio-time dependency.

### Hosting and origin permanence

Production hosting is GitHub Pages from the `settle-in` repository. The free tier requires the repository to be public; this is acceptable because real classes are never committed — they exist only on Clare's device — and all fixture content is invented.

Browser storage is bound to the origin. The production origin (`https://clare-healy.github.io`, app scoped under `/settle-in/`) is permanent once the first real class is imported. Any future move of the app's address requires a whole-library backup export and restore, planned deliberately outside class time.

## Time model

All durable times are stored as ISO 8601 timestamps with offsets. Displayed class times use the Pixel's local time zone and a 12-hour clock without seconds.

Durations are normalized to integer seconds.

### Plan expansion

Import expands the authored class into ordered runtime segments:

- One grounding segment
- One segment for each non-bilateral pose
- One segment for each side of a bilateral pose
- Explicit transition segments
- One savasana segment with six manually advanced internal steps

For a bilateral pose, each generated side receives the authored `duration_per_side_sec`.

`planned_offset_sec` is the sum of all earlier expanded runtime-segment durations.

### Re-anchored plan

`run_started_at` is captured when Clare activates Begin Class.

`run_local_date` is captured from the device's local date at the same moment. For the first teaching it will normally match the authored class date; rerunning a historical class uses the new run date. If the authored date and run date differ, the run remains linked to the authored class while its hard close follows the run date.

For every expanded segment:

```text
planned_start = run_started_at + planned_offset_sec
planned_end   = planned_start + planned_duration_sec
```

Beginning late therefore shifts the teaching plan with the room; it does not create drift by itself.

The hard close does not shift:

```text
hard_close_at = run_local_date + hard_close_local
```

`hard_close_at` is constructed exactly once, at Begin Class, using the device's then-current time zone offset, and is persisted with the run. It is never recomputed: a mid-run zone change, DST oddity, or clock adjustment does not move it, and the export shows the same instant Begin Class showed.

If a late start makes the re-anchored plan extend beyond the hard close, the UI continues to show the re-anchored planned window while also showing the fixed hard close. The app does not compress or automatically recompute remaining segments.

### Elapsed time

On entry to a segment, record a `segment_entered` event. While it remains current:

```text
elapsed = now - latest segment_entered timestamp for the current visit
```

Elapsed display uses `m:ss` and is calculated from timestamps, not by counting timer ticks. Rendering may update once per second.

### Clock discontinuities

Durable truth is the wall-clock timestamp; display stability comes from the monotonic clock. Teaching-state events record the wall-clock timestamp, a monotonic sample, and an execution identity. Within one execution, elapsed display uses monotonic deltas anchored to the visit's durable timestamp, so a wall-clock adjustment cannot make elapsed jump or go negative. Across process death, durable wall timestamps are the only truth and small adjustment error is accepted. When a discontinuity is detected (monotonic and wall deltas disagree beyond tolerance, or wall time moves backward), the app appends a `clock_discontinuity_noted` presentation event and continues calmly: no negative values, no alarm, no correction prompt.

### Drift

Drift is calculated when the current segment is entered:

```text
drift = actual_segment_entry - planned_start
```

It remains stable during that visit to the segment. Elapsed time and the planned window make a hold that is currently overrunning visible; the next segment entry incorporates that overrun into its drift.

Display drift rounded to the nearest whole minute:

- Absolute drift below 30 seconds: `on plan`
- Positive: `+N min`
- Negative: `−N min`

Drift is never red, alarming, animated, or described as an error.

A visit that begins via Previous (`segment_back`) displays `revisited` in place of a drift value: comparing a late correction against the segment's original planned start would be mathematically true but operationally meaningless. The original visit's drift remains in the event history and the as-taught record.

### Hard close and savasana signal

The wake message becomes **temporally eligible** at exactly two minutes before `hard_close_at`, normally 7:58 PM. Temporal eligibility alone never shows anything.

**The message displays only while the current segment is Savasana.** Both conditions must hold: the run is active, the clock has reached `hard_close_at - 120s`, and Clare is in Savasana. On Grounding, a pose, or a transition the message never appears, at any time. It is a signal to begin the gentle awakening, and it belongs only where that awakening happens; on any other screen it is a distraction in the room (field evidence, July 25, 2026).

Consequences:

- If Clare is already in Savasana when the clock reaches 7:58, the message appears then.
- If she enters Savasana after 7:58, it is present immediately on entry.
- If she is still teaching elsewhere at 7:58, nothing appears; the message waits for Savasana.
- A run begun at or after `hard_close_at` — a rehearsal later in the evening — shows no message on Grounding, poses, or transitions; entering Savasana shows it immediately, once. The message is not suppressed for rehearsals: it is simply gated on Savasana like every other run.

The message text is the class's authored `wake_message`, shown verbatim.

The message fades in once over approximately three seconds and remains visible until Clare advances or finishes. It never cycles, fades away on its own, makes sound, vibrates, or posts a notification. The `wake_message_shown` event is persisted immediately before the message's **first render in Savasana** — never merely because the clock passed 7:58 while another segment was current. The fade-once guarantee derives from that durable event, so a reload or process death after the message has shown recovers with it simply present — no replayed fade.

At 8:00 PM the app does not advance or end the class. It changes the quiet close indicator to `8:00 · hard close` and leaves the action with Clare.

A run begun at or after `hard_close_at` — for example a rehearsal later in the evening — shows the `8:00 · hard close` indicator immediately. This is defined behavior, not an error. There is no separate rehearsal or practice mode; the re-anchored planned windows still shift with the actual start, and nothing blocks running the class. The wake message follows the Savasana gate above and therefore does not appear until Savasana.

8:00 PM ends teaching, not the record. After the hard close, forward and back navigation and Finish remain fully available so Clare can stage the room's actual ending — even a few minutes past 8:00 while students roll up mats — and finalize the record at her pace. Nothing locks and nothing advances.

## Run state model

### Durable states

```text
no_active_run
active_run
finished_run_pending_notes
completed_run
abandoned_run
```

An active run contains:

- `run_id`
- `class_id`
- `run_started_at`
- Current expanded segment ID
- Current savasana step when applicable
- Minimal or expanded presentation state
- Ordered run events
- Wake-message acknowledgment state
- Draft post-class notes

The current-segment, savasana-step, presentation, and wake-acknowledgment fields are transactional projections of the event log: each is written atomically in the same transaction as the event it reflects, and rebuilding them from the event log must produce identical values (equivalence is tested). The event log remains the single source of truth; the projections exist for fast recovery, never as an independent record.

### Run events

Append events; do not rewrite history:

- `run_started`
- `segment_entered`
- `reference_expanded`
- `reference_collapsed`
- `savasana_step_advanced`
- `savasana_step_back`
- `segment_back`
- `segment_skipped`
- `substitution_noted`
- `wake_message_shown`
- `run_finished`
- `run_abandoned`
- `run_resumed`
- `clock_discontinuity_noted`

Savasana step movement in either direction is a teaching-state event and persists before rendering, so recovery returns to the exact step. `clock_discontinuity_noted` is a presentation-class event.

Only teaching-state events affect derived durations. Presentation events are retained only if useful for recovery and may be excluded from exports.

### Back navigation

Going back appends `segment_back` followed by a new `segment_entered` visit. It does not delete the first visit. Derived actual duration for a segment is the sum of its completed visits, bounded by the next teaching-state event.

### Finishing and abandonment

Finishing is a deliberate two-step action from the run. It records `run_finished` and opens Post-Class Notes.

Leaving the run without finishing requires a deliberate confirmation. Clare may resume later or mark it abandoned. Abandonment preserves the event history and never alters the class definition.

## Recovery treaty

Persist the active run after every teaching-state action and draft-note change. A page reload, app process death, device lock, or browser restart must recover from durable timestamps rather than memory.

On launch with an unfinished active run, show a calm recovery screen containing:

- Class title and date
- Actual start time
- Last active segment and side
- Current wall time
- `Resume class` as the primary action
- `End without resuming` behind confirmation

Resuming appends `run_resumed`, returns to the exact segment, and recalculates elapsed time from durable timestamps. It also requests a new wake lock.

Only one run may be active at a time. Beginning another class requires resolving the existing run.

## Wake-lock treaty

- Request a screen wake lock from the user-initiated Begin Class action.
- Monitor its release event.
- Re-request it whenever the document becomes visible during an active run.
- Release it after finishing or abandoning the run.
- Never promise that the platform will grant it.

If unavailable, show a quiet inline indicator such as `Screen may sleep · tap to retry`. The indicator must not cover teaching content, flash, vibrate, or trigger a system notification.

## Brightness and system interruption treaty

The app controls its rendered colors only. It does not attempt to change hardware brightness, Do Not Disturb, notification settings, or system volume.

Prep includes the preflight text:

> Do Not Disturb on · brightness set · battery comfortable

No application code may invoke audio playback, vibration, notifications, or haptic APIs.

## Persistence model

Use IndexedDB or an equivalently durable structured browser database rather than `localStorage` as the source of truth.

Run-start, teaching-state, wake-message, finish/abandon, and note transactions request strict storage durability (`durability: "strict"`) and are awaited to completion before the UI acknowledges the action. Default relaxed durability is acceptable only for presentation events and preferences.

Persist:

- Original imported Markdown
- Normalized immutable class definitions
- Validation and schema version metadata
- Run sessions and event histories
- Post-class notes
- Local preferences

Request persistent browser storage after the first successful import or installation, and re-check `navigator.storage.persisted()` on every launch. If persistence is not granted, explain in the Library—not during class—that device/browser cleanup could remove local data and that backup export is recommended. Persistence, even when granted, does not protect against user-initiated data clearing; the backup export is the real safety net and a verified backup is required before the first live-class pilot.

## Identity and immutability

- `class_id` identifies an authored class definition.
- `source_hash` identifies the imported UTF-8 Markdown after converting CRLF and CR newlines to LF and removing one optional UTF-8 byte-order mark. All other whitespace, including the final newline, remains significant.
- Importing the same `source_hash` twice is idempotent and does not create a duplicate.
- Importing changed content with an existing `class_id` creates a new revision only after explicit confirmation.
- A run refers to the exact class revision used when it began.
- Rerunning a class creates a new `run_id`.

## Import and export

### Import

1. Enforce input budgets before parsing: over-budget file size, line count, nesting depth, node count, or scalar length is rejected quietly with a plain explanation (canonical caps in the build plan).
2. Parse without executing embedded HTML, scripts, or links.
3. Normalize into the canonical data model.
4. Validate the complete object.
5. Present warnings separately from blocking errors.
6. Require confirmation before saving.

Validation errors should name the segment and field and include a source line when the parser can determine it.

### Export

Support:

- Original class Markdown
- One as-taught Markdown record containing plan and actuals, conforming to the as-taught export schema in `docs/class-format.md`
- Whole-library backup containing schema version, classes, revisions, runs, events, and notes

A whole-library restore parses and validates the entire backup before any write transaction opens; merge or replacement is then applied atomically, so a failure mid-apply leaves the library unchanged. Replacement is destructive and requires explicit confirmation. Merge is the default.

Merge semantics are deterministic union by identity: classes merge by `class_id`, revisions by `source_hash`, runs by `run_id`; events and notes travel with their run. An incoming entity whose identity already exists locally is skipped, never overwritten. Merge therefore cannot destroy local data; only explicit replacement can.

Class and as-taught exports are human-readable Markdown. The whole-library backup is a versioned machine-readable JSON file named like `settle-in-backup-2026-07-28.json`; it is not the weekly authoring format. Its top level contains `backup_schema_version`, `exported_at`, `app_version`, and the complete payload needed for lossless restore.

## Updates and migrations

- Application releases have an application version.
- Stored data and class inputs have independent schema versions.
- Database migrations must be forward-only, transactional where possible, and tested against fixture backups.
- A failed migration must preserve the prior data and show a non-studio-blocking recovery path.
- Service-worker updates must never interrupt a running client: while any client with an active run is open, a waiting worker must not activate, and the application never forces a reload to activate an update.
- If the process dies while a durable run is still active, the waiting worker may activate before the next launch. Recovery is therefore version-crossing: database migrations run before the recovery screen appears, and recovery must return to the exact segment across an application-version boundary. A failed migration preserves the prior data as above.

## Responsive and platform behavior

- Portrait is the designed orientation.
- Respect CSS safe-area insets and Android system bars.
- Do not assume the mock-up's fixed `370 × 780` canvas.
- Support the Pixel 6's normal viewport plus Android font scaling at 100% and 125% without clipping critical controls.
- Core actions have at least a 48 × 48 CSS-pixel effective target.
- Navigation zones are inset from system gesture edges.
- App-level back handling must never silently leave an active run.

## Privacy and security posture

- No analytics, ad scripts, third-party trackers, remote logging, or crash-report uploads in v1.
- Instructor notes remain local unless Clare explicitly exports them.
- Render imported content as text; never inject it as raw HTML.
- Do not include student-sensitive details in demo fixtures beyond invented initials.

## Implementation freedom

The builder may choose framework, styling approach, parser library, test runner, and internal module boundaries. Those choices are acceptable only if the acceptance tests remain satisfied and the deployed app remains quiet, offline, recoverable, and small.
