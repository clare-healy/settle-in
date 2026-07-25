# Settle In — Product Spec v4

Status: canonical product specification  
Primary user: Clare  
Primary device: Google Pixel 6  
Primary setting: Tuesday 7:00–8:00 PM yin class at Raw Emerald Yoga

## Product statement

Settle In (working title through v4: Yin Class Companion) is an instrument for running Clare's Tuesday yin classes. It carries the complete authored class into the room and answers a glance without becoming a presence in the room.

It is not a timer that conducts the class. It is a quiet reference that shows where the plan expected the class to be, records what actually happened, and leaves every teaching decision with Clare.

## Ends

The app exists to make these outcomes true:

- Clare enters the studio with props, arrival, theme, breath work, sequence, cues, timing, functional alternatives, and instructor notes in one dependable place.
- A glance answers the question of the moment in under two seconds.
- The phone remains perceptually quiet to students: no sound, vibration, notification, urgent color, or attention-seeking motion.
- Timing serves the room. Clare can run early or late without the app pressuring her or advancing on its own.
- The class ends at the hard 8:00 PM studio close.
- The app preserves both what was planned and what was taught.
- Each taught class strengthens future class construction through honest history, pose recency, and exportable reflection.

## Means

- A small static Progressive Web App installed from HTTPS onto Clare's Pixel 6.
- Fully usable offline after installation, including cold launch, class access, live running, notes, and export.
- No accounts, server-side application, cloud database, analytics, advertising, or studio-time network dependency.
- Class library and taught-run history stored on the device, with explicit backup export and restore import.
- Weekly classes authored with an AI assistant in the canonical Markdown format.
- The app parses, normalizes, validates, and summarizes the file before import.
- Classes are not edited inside the v1 app. Authoring corrections return to the AI-assisted workflow.
- As-taught exports follow the versioned export schema in `docs/class-format.md`. Pose recency and honest history reach future class construction through those exports in the weekly authoring workflow, not through an in-app analytics view.
- The app and the authoring assistant's project (currently the Claude project "Yin Flow State") form one integrated system. The project's instructions are maintained canonically in `docs/yin-flow-state-instructions.md`; any change to a class or export schema updates both sides of the system in the same change, even when the chat side must be applied manually.

## Principles

### 1. Silence is absolute

The app never emits audio, vibration, a system notification, or haptic feedback. There is no setting that enables them.

### 2. Glance, do not read

The default live screen contains only the information needed for the current teaching moment. Reference depth is one deliberate action away.

### 3. The plan is a lighthouse, not a conductor

The app shows planned position, actual time, and drift. It never advances a teaching segment automatically and never presents drift as failure.

### 4. Function first; form comes from the room

The visual language comes from Raw Emerald Yoga's actual palette, light, and materials. Legibility, predictability, and low glare outrank decoration.

### 5. Predictability on screen mirrors predictability in cueing

The same actions have the same meaning throughout a run. Clare never searches for navigation or wonders whether a tap will change timing.

### 6. Self-nourishing, anti-fragile utility

The authored class definition never changes after import. Each live teaching creates a separate run record derived from actual timestamped actions and supplemented by optional human notes.

### 7. Failure must be quiet and recoverable

A lost wake lock, accidental app closure, browser restart, or rejected import must not destroy the class or create an alarming studio moment.

## Primary workflow

### Weekly authoring

1. Clare and an AI assistant finish the week's class.
2. The AI assistant outputs the class using `docs/class-format.md`.
3. Clare pastes the Markdown or selects the `.md` file in the app.
4. The app validates it and shows class title, date, planned duration, pose and side count, hard close, and props.
5. Clare confirms import.
6. The class becomes the upcoming class without overwriting any previous class.

### Before class

1. Clare opens the upcoming class.
2. Prep shows props, staging assumptions, theme line, arrival, breath, and sequence.
3. Preflight reminds Clare to enable Do Not Disturb and set device brightness.
4. Begin Class records the actual start timestamp and requests a screen wake lock.

### During class

1. Grounding displays the theme anchor and tonight's grounding references.
2. Clare advances manually through pose sides and transitions.
3. The live pose screen prioritizes wall clock, pose and side, planned window, elapsed time, drift, midpoint cue, and a quiet next-pose preview.
4. A deliberate central action opens the expanded reference state without changing the teaching segment.
5. Going back records a navigation correction without deleting history.
6. Savasana remains manually staged, while the two-minute text appears automatically at 7:58 PM and remains until Clare advances.
7. Teaching ends at the 8:00 PM hard close; the run is finished through Clare's manual action, which may fall a few minutes after 8:00 as the room resolves. The app never advances or ends the class for her, and navigation never locks.

### After class

1. The app derives actual segment and side durations from the run event history.
2. Clare may mark a pose as skipped or substituted and add a brief room note.
3. Finishing saves the taught run separately from the class definition.
4. The plan, one run, or the full library can be exported for reflection or backup.

## V1 capabilities

- Import by paste and local Markdown file
- Plain-language validation with field and line location where possible
- Upcoming-class designation
- Prep, Grounding, Pose, Transition, Savasana, Post-Class, and Library screens
- Manual forward and back navigation
- Minimal and expanded pose states
- Re-anchored planned windows and informational drift
- Hard-close savasana message at 7:58 PM
- Screen wake-lock request, monitoring, and calm fallback
- Automatic persistence and interrupted-run recovery
- Immutable class definitions and multiple taught runs
- Human-readable Markdown export for a class or taught run
- Versioned whole-library backup export and restore

## Out of scope for v1

- Sound, vibration, haptics, or system notifications
- Automatic pose, side, transition, savasana-step, or class advancement
- Accounts, cloud sync, collaboration, or sharing services
- In-app class authoring or full editing
- Student-facing screens
- Pose media, illustrations, video, or audio
- Analytics or telemetry
- General-purpose settings beyond essential local preferences such as the next-pose preview
- Multi-user support

## Success measures

V1 is successful when:

- Clare can install it, enable airplane mode, cold-launch it, and teach a complete class from it on the Pixel 6.
- Every default live-state glance can answer its intended question in approximately two seconds.
- A reload or accidental closure does not lose the active segment, timing history, or notes.
- The app never makes a sound, vibrates, or posts a notification.
- The 7:58 PM wake message appears silently and remains visible.
- The exported record distinguishes the authored plan from each taught run.
- One real Tuesday class can be taught without returning to chat notes or paper.

## Field-learning rule

After the first live class, record observed friction before expanding scope. Real-room evidence may revise layout, copy density, tap geometry, and sequencing. It may not silently weaken the product principles.
