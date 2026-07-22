# Physical Device Checklist — Pixel 6

Status: canonical scripted passes for the acceptance tests that only physical hardware can prove. CI emulation is smoke coverage only; the tests below are marked passed HERE or not at all (adversarial review, node 4).

Record each run of this checklist at the bottom with date, app version, and Android/Chrome versions. A release candidate needs a fully green run; the first live-class pilot additionally needs the studio rehearsal section.

## Setup

- [ ] Pixel 6, current stable Chrome, gesture navigation enabled
- [ ] Production URL `https://clare-healy.github.io/settle-in/` reachable
- [ ] A verified whole-library backup exists if any real data is present (required before the pilot)

## A — Installation and offline (A1–A5)

- [ ] **A1**: Install from Chrome. App name "Settle In", taper icon, dark theme color, portrait, standalone (no browser chrome).
- [ ] **A2**: Enable airplane mode. Force-stop the app (system settings). Cold-launch from the launcher icon. Full app renders with Hanken Grotesk/Spectral (no fallback fonts — compare a known glyph), correct icons, no browser offline page.
- [ ] **A3**: Still in airplane mode: import a class (paste), open Prep, begin, navigate the entire run including expanded references and savasana steps, finish, write a note, export the as-taught record and a backup. Every step works.
- [ ] **A4**: With DevTools remote debugging (USB), reload and run the core workflow. Network panel shows zero requests to any non-app origin.
- [ ] **A5**: Deploy a trivial new version while a run is active on the device. No update prompt appears mid-run and the version does not change until after the run ends. Then: kill the app process mid-run with the update still waiting, relaunch — Run Recovery appears (possibly on the new version) and resumes to the exact segment.

## B — Silence (B1–B3)

- [ ] **B1**: Media volume up, DND off (deliberately). Run import → begin → navigate → 7:58 message → 8:00 → finish → recovery. Zero sound, vibration, or notification at every step.
- [ ] **B2**: Android app info → permissions/notifications: no notification permission requested or granted.
- [ ] **B3**: Prep shows the preflight line; nowhere does the app claim it changed brightness or DND.

## G — Wake lock (G1–G4 + review matrix)

- [ ] **G1**: Begin Class → screen stays awake past the system sleep timeout.
- [ ] **G2**: Background the app mid-run, return — screen-awake behavior resumes (lock reacquired).
- [ ] Lock the screen mid-run, unlock — run intact, wake lock reacquired, elapsed correct.
- [ ] **Battery saver ON**: begin a run. If the platform refuses the lock, the quiet `Screen may sleep · tap to retry` indicator appears; nothing flashes or covers teaching content; tap-to-retry works.
- [ ] Low battery (<15%): same observation as above.
- [ ] **G4**: Finish the run → screen sleeps normally at the system timeout afterward.
- [ ] **Battery drain**: note battery % at Begin and at Finish for a full 60-minute rehearsal run. Record it; no pass threshold in v1, evidence only.

## H — Process death (H3)

- [ ] Mid-pose, swipe the app away from Recents. Relaunch from the icon. Run Recovery shows the correct class, segment, side, and start time; Resume returns exactly there with correct elapsed time.
- [ ] Repeat once from a savasana middle step (verifies step-level recovery incl. backward steps if used).

## J — Dim room, scaling, and gestures (J1–J8)

- [ ] **J1/J2**: Import `valid-boundary-content.md`. At 100% Android font size, walk every live screen incl. the long-title pose minimal and expanded: nothing clipped, everything scrollable that should be.
- [ ] Repeat at 125% (or nearest larger) font size.
- [ ] **J3**: Every core control (Previous/Reference/Next, Begin, Finish, Resume, dialogs) is comfortably tappable without precision.
- [ ] **J4**: With gesture navigation, live-screen zone taps near the edges never trigger system back/home; system back from a live screen opens the Leave Class guard, never exits silently.
- [ ] **J5**: Squint test / grayscale (accessibility setting): peak marker, drift, warnings, current savasana step, disabled states all still distinguishable.
- [ ] **J6**: Enable "Remove animations" — transitions simplify, nothing becomes unclear, wake message still appears.

## Studio rehearsal (gates the pilot; J7/J8)

In the actual studio, lights at class levels, phone at Clare's normal placement:

- [ ] **J7**: From normal viewing distance, identify pose, side, wall clock, and midpoint cue in ~2 seconds each without picking up the phone.
- [ ] **J8**: From a student's mat position, the screen does not read as a bright, flashing, or attention-pulling source.
- [ ] Run a full 60-minute rehearsal (post-hard-close behavior included if started late). Record friction observations in the decision log as field evidence.

## Run log

| Date | App version | Android / Chrome | Result | Notes |
|---|---|---|---|---|
