# V1 Acceptance Tests

Status: canonical definition of build completion

A test passes only when the observable behavior matches the product principles. Automated coverage is expected for deterministic logic; physical-device and studio checks remain required.

## Test environments

- Current stable Chrome on Clare's Google Pixel 6
- Installed standalone PWA mode
- Portrait orientation
- Normal Android font size
- 125% Android font size or the nearest available larger setting
- Online installation followed by airplane-mode use
- Development browser for automated parser, timing, persistence, and state tests

## A. Installation and offline operation

### A1 — Installability

Given the production HTTPS URL, the Pixel 6 can install the app with its intended name, icon, theme color, portrait orientation, and standalone display.

### A2 — Complete application shell cache

After one successful installation and load, airplane mode is enabled and the app is fully closed. A cold launch renders the complete application with intended fonts and icons and no generic browser offline page.

### A3 — Offline core workflow

In airplane mode, Clare can open a stored class, begin, navigate the entire run, finish, write notes, and export a class or run.

### A4 — No hidden remote assets

After installation, the core workflow makes no required request to Google Fonts, a CDN, analytics, logging, or another third-party origin.

### A5 — Safe update timing

When a new service worker is waiting during an active run, no update prompt interrupts the run and the active application version is not replaced until the run has ended.

## B. Silence and platform boundaries

### B1 — Absolute silence

Across import, validation, begin, navigation, wake message, hard close, finishing, errors, and recovery, the app emits no sound, speech, vibration, haptic, or system notification.

### B2 — No forbidden capability

The production application does not request notification permission and contains no enabled code path invoking audio playback, vibration, haptic, or notification APIs.

### B3 — Brightness honesty

Prep reminds Clare to set brightness and Do Not Disturb. The app never claims it changed hardware brightness or system interruption settings.

## C. Class import and validation

### C1 — Valid fixture

Importing `fixtures/valid-desire-paths.md` produces no blocking errors and matches every expected value in `fixtures/expected-validation-errors.md`.

### C2 — Missing duration

Importing `fixtures/invalid-missing-duration.md` is blocked with the expected pose-specific correction and retains the source for editing or copying.

### C3 — Bilateral duration

Importing `fixtures/invalid-bilateral-duration.md` explains that bilateral duration is per side and requires `duration_per_side_min`.

### C4 — Safe parsing

Imported Markdown containing HTML, a script tag, a link, or a YAML executable/custom tag is never executed. Unsupported YAML features are rejected or treated as text according to the parser treaty.

### C5 — Idempotent duplicate

Importing the exact same normalized source twice does not create a second class.

### C6 — Changed revision

Importing changed source with an existing `class_id` identifies a revision and requires confirmation. Existing runs retain their original revision.

### C7 — Unsupported future schema

A file with `schema_version: 999` is rejected intact with an update-required explanation and no partial library write.

### C8 — Import summary

Before saving the valid fixture, the confirmation shows title, date, 60 planned minutes, five authored poses, eight teaching sides, five transitions, peak pose, hard close, props, and warnings.

### C9 — Warning without blocking

Importing `fixtures/warning-short-plan.md` produces no blocking errors and exactly the short-plan warning from `fixtures/expected-validation-errors.md`. Confirmation remains available and the class can be saved.

### C10 — Schedule warning

A valid file with a non-Tuesday `date` or a `scheduled_start_local` other than `19:00` imports with a warning and no blocking error.

## D. Timing

Automated timing tests use a controllable clock.

### D1 — Bilateral expansion

Sleeping Swan with `duration_per_side_min: 4` expands into Right for four minutes followed by Left for four minutes. It contributes eight planned minutes.

### D2 — Canonical planned windows

For the valid fixture begun at 7:00 PM:

- Grounding is planned for 7:00–7:10.
- Supported Caterpillar is planned for 7:24–7:30.
- Savasana is planned for 7:45–8:00.

### D3 — Late begin re-anchor

When Begin Class occurs at 7:03 PM, Grounding is planned for 7:03–7:13 and initial drift is `on plan`. The hard close remains 8:00 PM and the wake message remains eligible from 7:58 PM (displayed only once Savasana is current).

### D4 — Drift on segment entry

If a segment's re-anchored planned start is 7:15 and it is entered at 7:18, drift is `+3 min` and remains stable during that visit.

### D5 — Early entry

If a segment's planned start is 7:15 and it is entered at 7:13:40, rounded drift displays `−1 min`.

### D6 — On-plan threshold

Entry from 29 seconds early through 29 seconds late displays `on plan`.

### D7 — Timestamp-derived elapsed

Elapsed time remains correct after rendering pauses, backgrounding, or delayed timer callbacks. It is derived from durable timestamps rather than tick count.

### D8 — No automatic segment advancement

Passing a segment's planned end changes no teaching state.

### D9 — Hard close

At 8:00 PM the app displays `8:00 · hard close`, never a negative countdown, and does not automatically advance or finish.

## E. Wake message

The message is gated on BOTH the clock and the segment: eligible at `hard_close_at − 2 min`, displayed only while the current segment is Savasana.

### E1 — Normal savasana

When the valid fixture begins at 7:00 and Clare is in Savasana at 7:58, the wake message fades in once and stays visible.

### E2 — Late savasana entry

When Savasana is entered after 7:58, the wake message is present immediately on entry.

### E3 — Never outside Savasana

When the active run is still in Grounding, a pose, or a transition at 7:58, **no callout renders and no `wake_message_shown` event is persisted**. Advancing into Savasana then shows the message once, and only then is the event written.

### E4 — No loop

After appearing, the wake message does not fade out, restart, pulse, or repeat automatically.

### E5 — Silence

The wake message produces no audio, vibration, haptic, or notification.

### E6 — Durable fade-once

`wake_message_shown` persists immediately before the message's first Savasana render. A reload or process death afterwards recovers with the authored message present and no replayed fade animation.

### E7 — Authored text

The message displays the class's authored `wake_message` verbatim.

### E8 — Post-hard-close rehearsal

A run begun at or after `hard_close_at` shows no wake message on Grounding, poses, or transitions, and no `wake_message_shown` event exists while those segments are current. Entering Savasana shows the message immediately, once. The `8:00 · hard close` indicator behavior is unchanged throughout.

## F. Navigation and state

### F1 — Manual forward

Activating Next once enters exactly one runtime segment or savasana step and immediately persists the event.

### F2 — Manual back

Activating Previous revisits the prior segment and preserves the earlier visit in history.

### F3 — Bilateral sequence

For Sleeping Swan, Next from Right enters Left; it does not jump to the following transition or authored pose.

### F4 — Reference separation

Opening and scrolling expanded reference content does not advance, reset elapsed time, or alter drift.

### F5 — Android system back

System Back closes a dialog, then an expanded reference, then shows the guarded Leave Class sheet. It never silently exits an active run or means Previous Pose.

### F6 — No accidental finish

Finishing and abandoning each require a deliberate two-step action.

### F7 — One active run

The app prevents beginning a second run until the current run is resumed, finished, or abandoned.

### F8 — Revisited display

A segment entered via Previous shows `revisited` in place of a drift value. The original visit's drift remains in the event history and the as-taught export.

### F9 — Serialized input

Rapid repeated taps produce exactly one committed teaching-state action each; a second tap during a pending persistence transaction cannot reorder or skip segments.

## G. Wake lock

### G1 — Request on begin

Begin Class requests a screen wake lock from the user action and records the run even if the request fails.

### G2 — Release and reacquire

If the wake lock is released when the app becomes hidden, returning to the visible active run requests a new lock.

### G3 — Quiet failure

If wake lock is unavailable, the live screen shows `Screen may sleep · tap to retry` without obscuring teaching content or becoming an alarm.

### G4 — Release after run

Finishing or abandoning releases the held wake lock.

## H. Persistence and recovery

### H1 — Immediate durable actions

Every teaching-state navigation, finish/abandon action, substitution, and draft-note change is durable before the UI accepts another destructive action.

### H2 — Reload recovery

Reloading mid-pose opens Run Recovery. Resume returns to the same class revision, segment, side, and savasana step with correct elapsed time.

### H3 — Process-death recovery

Force-closing and reopening the installed PWA produces the same result as H2.

### H4 — Back-visit duration

When a segment is visited twice, its derived actual duration is the sum of both bounded visits and its status indicates `revisited`.

### H5 — Immutable plan

No navigation, note, status correction, rerun, or export mutates the imported class definition.

### H6 — Separate reruns

Running the same class twice creates two run IDs and preserves both histories.

## I. Post-class and export

### I1 — Reflection is the only post-class input

Post-Class shows one multiline reflection box and no per-segment rows or manual status controls. The draft persists on every input event, so a dictation interrupted by backgrounding, a lock, or process death is recovered intact. Derived actuals and statuses are not shown here; they are retained and appear in the as-taught export.

### I2 — Retired

Manual skip and substitution correction was retired on July 25, 2026 (Post-Class became a single reflection). Automatic skip derivation is covered by I4.

### I3 — Optional notes

Clare can complete a run with or without a room note.

### I4 — As-taught export

An exported run conforms to the as-taught export schema in `docs/class-format.md`: it identifies its class revision and contains planned and actual durations, derived statuses, revisits, and the reflection.

Fixture coverage must include:

- **Automatic skip:** a completed run where a segment was never entered exports `status: skipped` with `actual_sec: 0`, without any manual correction having been made.
- **Entered but brief:** a segment entered and left quickly still exports `short`, never `skipped`.
- **Historic substitution:** a run whose stored events contain a `substitution_noted` event still exports `status: substituted` with its `substituted_with` name, proving backward compatibility with runs recorded before the correction UI was retired.

### I5 — Whole-library round trip

Exporting a library, clearing a test profile, and restoring with merge reproduces classes, revisions, runs, events, and notes without duplication.

### I6 — Replace confirmation

Restore never replaces an existing library without explicit destructive confirmation.

## J. Layout, access, and dim-room use

**Verification status (July 25, 2026).** Every J-series result recorded before this date is void. The production CSP blocked Vite's dev-server style injection, so the Playwright suites — the only tests with a real layout engine — were asserting against an unstyled document. The Vitest DOM tests use happy-dom, which has no layout engine at all.

Consequently **J1–J4, J6, the layout portion of J5, the §14 indicator geometry, the live 20/60/20 zone ratios and gesture insets, safe-area behavior, and all prior scroll-reachability evidence are demoted to unproven** until re-established. J7 and J8 were always device-only and remain unproven.

Re-proof comes from two places, and nothing else counts:

1. **Strict-production browser coverage** — a Playwright project running against the actual built artifact under the real production CSP (`playwright.strict.config.ts`), asserting the stylesheet is present and applied before any geometry is measured.
2. **The physical Pixel 6**, per `docs/device-checklist.md`, which remains the acceptance authority for font scaling, safe areas, gestures, keyboard-open Import, dialogs, browser versus installed mode, tap highlight, wake lock, and dim-room use.

A CI result may never be reported as satisfying a J-series criterion on its own.

### J1 — No critical clipping

At normal and 125% Android font scaling, every critical live value and action remains visible or deliberately scrollable. Expanded cue content is never hidden by fixed overflow.

### J2 — Long-content fixtures

Importing `fixtures/valid-boundary-content.md` — which pins a 36-character pose title, 150-character midpoint cue, and 280-character expanded cue on a single pose — renders without collision or inaccessible content.

### J3 — Touch targets

Previous, Reference, Next, Begin, Finish, Resume, and dialog actions each have at least a 48 × 48 CSS-pixel effective target.

### J4 — System gesture safety

Live navigation remains reliable on the Pixel 6 with Android gesture navigation enabled and is inset from the physical edges.

### J5 — Meaning without color

Peak, drift, validation error, warning, current savasana step, and disabled state remain understandable without relying on hue alone. The layout portion of this check (that the distinguishing structure actually renders) is part of the strict-production coverage; the perceptual judgment is device-only.

### J6 — Reduced motion

With reduced motion enabled, positional transitions are removed and no required state becomes unclear.

### J7 — Physical glance test

In the actual studio, from Clare's normal phone placement and viewing distance, pose, side, wall clock, and midpoint cue can each be identified in approximately two seconds without picking up the phone.

### J8 — Student quietness test

From a student's ordinary position, the screen does not read as a bright, flashing, or urgent source in the room.

### J9 — No blue platform tap highlight

No tap anywhere in the app produces the Android default blue highlight. The live zones instead show a static, subtle warm pressed state (a low-alpha Candlelight Amber inset edge and slight affordance brightening) — never a full-zone fill and never an animation. Text selection remains enabled. Verified in strict-production browser coverage for the CSS cascade and pressed style, and on the Pixel for the actual platform flash.

### J10 — Live surface does not clip

`.live` and `.live__stage` are `overflow: hidden`, so the `.screen` scroll safety net cannot rescue a live screen that overflows. At 100% and 125% font scale, with the longest pose title, the wake-lock indicator present, and on Savasana, no live content is clipped or unreachable. Any demonstrated clipping is fixed by reflowing the live hierarchy, never by making the live tap surface generically scrollable.

## Release gate

The first live-class pilot requires all A–I tests and J1–J6 to pass. J7 and J8 are completed during a studio rehearsal before students arrive. Observations from the first taught class are recorded as field evidence before scope expands.

