# Screen and Interaction Treaty

Status: canonical v1 screen behavior

## Global interaction rules

### Live-run tap map

The live teaching surface has three deliberate vertical zones:

- Previous zone: left 20% of the usable viewport
- Reference zone: center 60%
- Next zone: right 20%

Zones are inset from physical system-gesture edges by at least 12 CSS pixels. Their effective targets are at least 48 CSS pixels in each dimension.

On minimal Pose and Grounding screens:

- Previous zone enters the previous runtime segment.
- Reference zone opens the expanded reference state.
- Next zone enters the next runtime segment.

On expanded screens:

- Previous and Next retain their meanings.
- Reference-zone content scrolls vertically.
- A deliberate `Close reference` control returns to minimal state.
- Tapping ordinary text does not close the reference or change segments.

On Transition:

- Previous and Next navigate segments.
- The center does not open a second layer unless additional transition notes exist.

On Savasana:

- Previous returns to the previous savasana step, or the previous runtime segment from the first step.
- Next advances the six internal steps; after the sixth, it exposes Finish Class rather than silently finishing.
- The center has no hidden expansion action.

Navigation zones have subtle persistent affordances. The interface must not depend on an invisible gesture that Clare has to remember.

### Android system back

System Back behaves in this order:

1. Close an open dialog.
2. Close an expanded reference state.
3. During an active run, open the guarded Leave Class sheet.
4. Outside a run, navigate within normal app history.

System Back never means “previous pose.” That action belongs only to the visible Previous zone.

### Destructive or run-ending actions

Leaving, abandoning, finishing, replacing a library during restore, or importing a changed revision requires a deliberate confirmation. Ordinary forward/back segment navigation does not.

### Loading behavior

The installed app shell and local data should open without a spinner. If an operation genuinely takes time, use quiet static copy such as `Opening library…`; never use a rapidly rotating or pulsing element.

## 1. First launch / empty library

Purpose: get the first authored class into the app.

Shows:

- App name and one-line purpose
- `Import a class` primary action
- `Restore library backup` secondary action
- Quiet offline-install status if the app is not yet installed or cached

Does not show sample classes as if they were Clare's history.

## 2. Import

### Input state

Shows:

- Large paste field
- `Choose Markdown file`
- `Validate class`
- Link to a concise schema-v1 example

No content is saved when validation begins.

### Validating state

Shows static `Checking class…` copy. The app remains silent.

### Blocking-error state

Shows:

- Plain-language summary
- One row per error with segment, field, source line when available, and correction guidance
- Original source preserved in the input
- `Copy errors` action for returning them to the AI assistant
- `Check again`

Errors use warm contrast, text, and structure rather than red-only signaling.

### Warning state

Warnings do not block confirmation. Examples include unusually long cues or a plan shorter than 60 minutes.

### Confirmation state

Shows the import summary required by `class-format.md`, followed by:

- `Import class`
- `Return to source`

If an identical source hash already exists, show `This exact class is already in the library` and open the existing class instead of duplicating it.

If the `class_id` exists with different source content, identify it as a new revision and require confirmation.

## 3. Home / upcoming class

Purpose: reach tonight's class with one action.

Shows:

- Upcoming class title, date, theme line, planned duration, and hard close
- `Open Prep`
- Library access
- Import access
- Unobtrusive local-backup status

If more than one future class exists, the earliest date is suggested; Clare explicitly chooses which is upcoming.

If an active run exists, Home is replaced by Run Recovery.

## 4. Prep

Purpose: stage the room and begin deliberately.

Shows in this order:

- Title, date, theme line, and felt sense
- Preflight: `Do Not Disturb on · brightness set · battery comfortable`
- Props
- Room setup
- Arrival
- Breathwork
- Full sequence with expanded side-aware planned times and peak marker
- Hard close
- `Begin Class`

The sequence may scroll. `Begin Class` remains reachable without content being clipped and is not obscured by browser or system UI.

A quiet Display Options disclosure may toggle the next-pose preview. Its default is on. Display Options are not available accidentally during the run.

Activating Begin Class:

1. Checks for another active run.
2. Records `run_started_at`.
3. Persists the new run.
4. Requests wake lock.
5. Enters Grounding.

## 5. Grounding

### Minimal

Shows:

- `Grounding`
- Large wall clock
- Planned window and elapsed time
- Drift
- Theme anchor
- Quiet next-pose preview

### Expanded

Adds:

- Three yin principles
- Sensation scale guidance
- Guided/silent ratio
- Arrival and breathwork reference

Long content scrolls within the reference area.

## 6. Pose

### Minimal

Hierarchy:

1. Pose name and side, when applicable
2. Large current wall clock
3. Planned window and elapsed-in-current-visit
4. Informational drift
5. Midpoint reorientation cue
6. Next authored pose name and planned start
7. Subtle Previous / Reference / Next affordances

A visit entered via Previous shows `revisited` in place of the drift value (see the implementation treaty's drift rules).

For Side 1, the next preview names the same pose's Side 2 only if that is the immediate teaching destination. A separate secondary label may show the next authored pose. The UI must not imply that Side 2 is being skipped.

### Expanded

Keeps a compact sticky header containing pose, side, wall clock, planned window, and elapsed time.

Scrollable fields:

- Entry
- Target
- Settling
- Midpoint
- Props and setup
- Functional alternative
- Exit
- Instructor note

There is no `overflow: hidden` clipping of authored cue content.

## 7. Transition

Shows:

- `Transition`
- Next pose name and side when applicable
- Large current wall clock
- Planned window, elapsed time, and drift
- Setup narration
- Functional alternative to offer before settling
- Quiet destination preview

Transition navigation is manual. Expiration of its planned minute changes no state.

## 8. Two-minute hard-close message

The message appears **only on the Savasana screen**, and only once the clock has reached two minutes before the hard close. It never appears on Grounding, a pose, or a transition — at any time, including a rehearsal begun after 8:00.

On Savasana, once eligible:

- Fade in the class's authored `wake_message` once, verbatim, in the dedicated lower message area.
- Persist `wake_message_shown` immediately before that first render — not when the clock passes 7:58 on some other screen.
- Keep it visible until the next teaching-state action or Finish Class.
- Do not obscure the wall clock, current step, or navigation affordances.
- Do not animate it again.

There is no lower callout on non-Savasana screens. Entering Savasana after the eligibility time shows the message immediately, without animation replay if it has already been shown.

## 9. Savasana

Shows only:

- `Savasana`
- Hard close and current wall clock
- Six fixed steps
- Current step
- Time to hard close, until 8:00
- Two-minute message when eligible
- Previous and Next affordances

Past steps remain quietly visible; future steps are subdued but legible at close viewing distance. The active step is not animated continuously.

At or after 8:00, replace countdown language with `8:00 · hard close`. Do not use negative time. Navigation and Finish remain fully available after 8:00; nothing locks.

After the final step, Next reveals a deliberate `Finish Class` action with confirmation.

## 10. Leave Class guard

Shows:

- `Return to class` as the primary action
- `Leave open to resume later`
- `End this run` behind a second confirmation

Simply leaving the app or turning off the screen does not abandon the run.

## 11. Run Recovery

Appears on launch when one active run exists.

Shows:

- Class title and date
- Start time
- Last segment and side
- Current time
- `Resume class`
- `End without resuming` behind confirmation

It does not automatically resume and request wake lock before Clare acts.

## 12. Post-Class Reflection

One generous multiline text box for a free-form reflection, and nothing else to curate.

Shows:

- Class title and date, and the actual start and finish times
- A single native `textarea` for the reflection, given most of the screen
- `Save and complete`
- `Skip and complete`

Clare will not review a class segment by segment after teaching. What she will realistically do is pick up her phone, use voice-to-text on the Gboard keyboard, and speak whatever she noticed. The screen is shaped for that and asks for nothing else (field evidence, July 25, 2026).

Therefore this screen shows **no per-segment rows and no manual Skipped or Substituted controls**. Plan-versus-actual timing is not lost: it is derived from the run's events and travels in the as-taught export, which is what feeds the next week's authoring. The app already knows the timing and never asks Clare to restate or curate it.

Requirements for the reflection box:

- A plain native multiline `textarea` — no rich editor, no keystroke interception, so Gboard voice dictation behaves normally.
- Persist the draft on every `input` event, not only on `change` or blur, so a dictation survives backgrounding, a lock, or process death mid-sentence.
- Generous height, comfortable text size, and no character limit.

## 13. Library

### List

Shows authored classes by date with:

- Theme
- Peak pose
- Planned duration
- Number of taught runs
- Upcoming marker when applicable

### Class detail

Shows:

- Immutable authored plan
- Revision identity
- Each taught run as a separate record
- `Run this class again`
- Export original Markdown
- Export selected as-taught run

Rerunning always creates a new run.

### Backup and restore

Library provides:

- Export whole-library backup
- Restore and merge backup
- Replace local library only behind explicit destructive confirmation

Storage-persistence warnings appear here, not during a class.

## 14. Quiet technical states

### Wake lock unavailable

Inline live indicator: `Screen may sleep · tap to retry`.

### Application update ready

Outside a run: `Update ready · apply now`.  
During a run: defer without prompting.

### Storage warning

Library-only message: `This device may clear local data. Export a backup after class.`

### Unsupported class version

Import error: `This class uses schema version N. Update the app before importing it.` Preserve the source.

## Reference wireframes

Wireframes refine the build; they do not gate it. The build may implement every screen from this treaty and the design system directly. The visual lock is on-device verification (design-system "Visual verification") plus the studio rehearsal, not a mock-up set.

Claude Design frames are most valuable, before visual lock, for the four highest-visual-risk states:

- Pose minimal with a long title
- Pose expanded with overflowing copy
- Savasana
- Two-minute callout outside Savasana

Frames for the remaining states are welcome refinements whenever they arrive:

- Empty library
- Import input
- Import errors
- Import confirmation
- Grounding minimal and expanded
- Transition
- Post-Class Notes
- Library list and detail
- Run Recovery
- Leave Class guard
- Wake-lock unavailable

