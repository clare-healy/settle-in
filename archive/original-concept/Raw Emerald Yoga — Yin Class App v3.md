# Yin Class Companion — App Spec v3

  

An instrument for running Clare's Tuesday yin classes at Raw Emerald Yoga. Built from the class we generate together each week and carried into the room on a phone. In the moment it answers a glance; when needed, it holds the exact language we workshopped, the propping details, and the functional alternatives, ready as a reference.

  

---

  

## Ends

  

What this app exists to make true:

  

- Clare walks into the studio with the full class in her pocket: props, theme, breath work, sequence, cues, timing. No scrolling through a chat thread.

- Every glance answers its question in under two seconds. During a hold: where am I in time. During a transition: what comes next and how to set it up. During grounding: the theme anchor. Before class: props and staging.

- The phone is invisible to students. No sound, no vibration, no light show, no timer anxiety. The room's rhythm stays with Clare's hands and voice, not the device.

- Timing serves the room, not the plan. The plan is a reference; Clare adjusts live. The app tells her where she stands relative to the plan and gets out of the way.

- Over time, the library becomes an honest teaching record: what was planned and what actually happened, closing the gap where planned sequences differ from the taught class. This feeds pose rotation tracking and recency sweeps. The library is a SNAFU in the full sense: a self-nourishing, anti-fragile utility. Every class taught strengthens the next class we build, and the places where plan and room diverged are exactly where the learning lives.

  

## Means

  

How it gets built and how classes flow into it:

  

- **Form:** a single-file web app built for Android, installed to the home screen of Clare's Google Pixel via Chrome's "Install app" / "Add to Home Screen." Runs full-screen like a native app under Pixel OS. Works fully offline once loaded. Class library stored on-device in browser storage. No accounts, no server, no network needed in the studio.

- **Weekly flow:** Clare and Claude finish a class → Claude outputs the class in the Class File format (below) → Clare pastes it into the app's import screen (or uploads the .md file) → the app validates it and shows a confirmation summary (pose count, total planned time, props list) → the class lands in the library, marked as this week's class.

- **Nothing hand-formatted, ever.** If the file doesn't validate, the app says exactly what's missing in plain language, and the fix happens back in Claude.

  

## Principles

  

1. **Silence is absolute.** The app never emits sound, vibration, or system notification. No exceptions, no settings toggle to break this. The only signal it ever gives is text appearing on its own screen: the savasana two-minute wake message.

2. **Glance, don't read.** The default state of every screen is the minimum needed for its moment. Depth is one tap away, never forced.

3. **The plan is a lighthouse, not a conductor.** Timing windows are shown, drift is shown, nothing is enforced. Clare advances everything manually.

4. **Function first, form from the room.** Visual design derives from the studio's actual palette and light (reference photos to come). Legible in a dim room at arm's length.

5. **Predictability on screen mirrors predictability in cueing.** Every pose screen has the same layout, the same tap zones, the same phases. Clare never hunts.

6. **The record tells the truth.** Post-class notes capture what actually happened, so the library reflects taught classes, not just planned ones.

  

---

  

## Screens

  

### 1. Prep (before class)

The 6:45–7:00 screen. Shows:

- Props list for tonight (mat count assumptions, bolsters, blocks, blankets, wall use)

- Theme in one line, plus the felt-sense framing

- **Grounding** — a short description of how to open the class (the settling-in before the theme). Shown on the Prep screen because Clare cues moving into grounding *before* she looks at the phone for the theme — essentially the moment she begins class.

- **Breath** — a short description of tonight's breath work

- Sequence at a glance: pose names in order, peak pose marked, planned timestamps

- A single **Begin Class** action that starts the run and records the actual start time

  

### 2. Grounding (8–10 min)

- Theme anchor front and center, in Clare's own words from the guide

- Three yin principles and sensation scale (0–10, aiming 2–5) as a quick-reference block, tap to expand

- Guided/silent ratio note for tonight's room

- Clock + planned window (e.g., 7:02 – 7:11)

- Tap right edge to move to pose one

  

### 3. Pose Run (the core screen)

**Minimal state (default):**

- Pose name (and Side 1 / Side 2 for bilateral poses)

- Current clock time, large — the primary timing element

- Planned window (7:14 – 7:18) and elapsed-in-pose as the secondary line

- Drift chip: a small "+3 min" or "−2 min" against plan; informational only, never colored as an alarm

- Tonight's midpoint reorientation cue for this pose

- **Next-pose preview:** a quiet line at the foot of the screen showing the pose that comes next (name and its planned start time), so Clare can see what's coming without leaving the current pose. Derived from sequence order — no extra authoring. Rendered in the muted "next" accent so it never competes with the clock. Can be toggled off.

  

**Expanded state (one tap on the card):**

- Entry cues (invitational, action-based)

- Target area

- Settling cues with sensation scale callback

- Props and setup

- Functional alternative shape

- Exit cues

- Instructor-side notes, visually separated

  

**Navigation:** tap right edge = next (Side 2, transition, or next pose). Tap left edge = back. Edge zones are generous and work with a thumb, one-handed. A deliberate two-step confirms leaving the run entirely, so a stray tap can't exit class.

  

### 4. Transition (1 min between poses)

- Next pose name and its prop setup narration — the props are described here because Clare cues setup during transitions, never mid-hold

- The functional alternative offered before settling, so it's on screen when she offers it

- Clock and drift carry over

  

### 5. Savasana (15 min)

- The six steps as a fixed list, current position advanced by edge tap

- Clock plus time-to-close (e.g., ends 8:00)

- **Two-minute wake signal:** at two minutes to close, a text message fades in on screen, something like "Two minutes. Time to begin the gentle awakening." On-screen text only: no sound, no vibration, no system notification. It stays until Clare advances.

- Nothing else on screen

  

### 6. Post-Class Notes (optional, 60 seconds)

After the run ends, a quick capture screen:

- Per-pose: held as planned / ran long / ran short / swapped or skipped (tap chips, no typing required)

- One free-text field for anything about the room

- Saves into the class record as "as taught" alongside "as planned"

  

### 7. Library

- Past classes listed by date with theme and peak pose

- Any class openable in read mode or re-runnable

- Export: copy a class (or the as-taught record) back out as markdown, so it can be pasted into Claude for recency sweeps and reflection

  

---

  

## Timing model

  

- The wall clock is primary everywhere; elapsed-in-pose is secondary.

- Planned timestamps come from the class file but re-anchor to the actual Begin Class time (so a 7:03 start shifts every window by three minutes automatically — the plan meets the room where it is).

- Drift = actual position vs re-anchored plan, shown as a small signed number. No recomputation of remaining windows; Clare adjusts herself.

- The screen stays awake for the full run (wake lock), dimmed to the app's night brightness.

- Prep screen includes a one-line preflight reminder: phone in Do Not Disturb, brightness where you want it. The app cannot silence the phone itself; the ritual covers it.

  

## Class file format

  

Claude produces this at the end of each week's session. Structured markdown with a small header block:

  

```

---

title: Desire Paths

date: 2026-07-28

theme_line: one-sentence theme anchor

props: bolster, two blocks, blanket

grounding: short settling-in description (shown on Prep)

breathwork: notes here

peak: Supported Caterpillar

---

  

## Grounding (9 min)

theme anchor text / principles notes / ratio note

  

## Pose: Supported Butterfly (4 min) [bilateral: no]

entry: ...

target: ...

settling: ...

midpoint: ...

props: ...

alternative: ...

exit: ...

notes: ...

  

## Transition (1 min)

next-pose prop narration

  

... (repeat)

  

## Savasana (15 min)

(six steps assumed; overrides optional)

```

  

Exact schema to be finalized in the build, but the contract is: Claude formats, the app validates, Clare pastes.

  

## Look and feel

  

- Palette, texture, type, motion, and light locked in the companion **Raw Emerald Yoga — Design Brief** (built from the studio photos). Pond Charcoal base, Taper Wax clock, Candlelight Amber for the live/active state, one cool Mandala Indigo drift note; Hanken Grotesk for glance (clock, pose names), Spectral for cues; the muted Lotus Blush carries the next-pose preview.

- Dim-room legibility: large type for the clock and pose name, low-glare surfaces, no pure white screens at 7 PM

- One consistent layout across all pose screens; no animation beyond gentle state changes

- Everything reachable one-handed

  

## Out of scope for v1

  

- Audio, vibration, and system notifications of any kind

- Automatic pose advancement or timers that act on their own (the savasana two-minute text message is the single exception, and it advances nothing)

- Cloud sync, accounts, sharing

- In-app class editing (classes are authored with Claude, not in the app)

  

## Open items

  

1. ~~Studio reference photos → locks the visual design~~ **Done** — photos in hand, visual system captured in the Design Brief and applied in the screen mockups.

2. Finalize the class file schema during the build (now includes the `grounding` header field)

3. First build target: run one real Tuesday class from it, then revise from what the room teaches us