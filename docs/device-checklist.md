# Physical Device Checklist — Pixel 6

Status: canonical scripted passes for the acceptance tests that only physical hardware can prove. CI emulation is smoke coverage only; the tests below are marked passed HERE or not at all (adversarial review, node 4).

**Standing as of July 25, 2026.** Every layout result recorded before this date is void — the production CSP blocked Vite's dev-server styles, so the Playwright suites were asserting against an unstyled document (decision log, "Verification repair gate"). J1–J4, J6, the layout portion of J5, §14 indicator geometry, live zone ratios and insets, safe-area behavior, and prior scroll-reachability evidence are all **unproven** until this checklist and the strict-production browser project re-establish them. Nothing below has been run on the Pixel yet.

Record each run of this checklist at the bottom with date, app version, and Android/Chrome versions. A release candidate needs a fully green run; the first live-class pilot additionally needs the studio rehearsal section.

## Setup

- [x] Pixel 6, current stable Chrome, gesture navigation enabled
- [x] Production URL `https://clare-healy.github.io/settle-in/` reachable
- [x] A verified whole-library backup exists if any real data is present (required before the pilot)

## A — Installation and offline (A1–A5)

- [x] **A1**: Install from Chrome. App name "Settle In", taper icon, dark theme color, portrait, standalone (no browser chrome).
- [x] **A2**: Enable airplane mode. Force-stop the app (system settings). Cold-launch from the launcher icon. Full app renders with Hanken Grotesk/Spectral (no fallback fonts — compare a known glyph), correct icons, no browser offline page.
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

## Q5 field-evidence re-checks (July 25, 2026)

These exist because Clare found all three in her first practice run. Run them before anything else — they are what stands between her and teaching from the app.

- [ ] **J9 — no blue tap flash.** In the installed app, tap the Previous zone, the Reference zone, the Next zone, and a Savasana step, in a dim room. **No blue highlight of any kind appears.** The zones instead show a quiet warm edge while pressed, which disappears on release. Nothing animates.
- [ ] Long-press and double-tap on cue text: if a blue selection highlight appears and reads as intrusive in the room, record it — `::selection` recoloring is conditional on this observation.
- [ ] **E3/E8 — wake message is Savasana-only.** Begin a rehearsal run *after* 8:00 PM. Walk Grounding → pose → transition: **no two-minute message appears on any of them.** Advance into Savasana: the message appears immediately, once, and does not re-animate. The `8:00 · hard close` indicator behaves as before throughout.
- [ ] Repeat during real class hours if possible: at 7:58 while still in a pose, confirm nothing appears; on entering Savasana, it appears once.
- [ ] **I1 — reflection box.** Finish a run. Post-Class shows one large text box and no per-pose rows. Tap the microphone on the Gboard keyboard and dictate a few sentences. Text lands correctly. Background the app mid-dictation, reopen: **the draft is still there.** Save and complete.
- [ ] Export that run and confirm the reflection appears in the `## Room note` section, and that a pose you skipped shows `status: skipped` without you having marked anything.

## J10 — Live surface does not clip

`.live` and `.live__stage` are `overflow: hidden`, so a live screen that overflows cannot be rescued by scrolling. Check each of these at **both** 100% and 125% font scale:

- [ ] Grounding with the wake-lock indicator visible — theme anchor fully readable, nothing cut off.
- [ ] The longest pose title in the class, minimal state — title, clock, planned window, drift, midpoint cue, and next-pose preview all fully visible.
- [ ] Savasana with all six steps and the two-minute message present — no step or control clipped.
- [ ] Transition screen with the longest setup narration.

If anything clips, record exactly which screen and scale. The fix is to reflow the live hierarchy — never to make the live tap surface scrollable.

## J — Dim room, scaling, and gestures (J1–J8)

- [ ] **Keyboard-open Import**: open Import, tap into the paste field so the Android keyboard opens. The `Validate class` action remains reachable and nothing is clipped behind the keyboard. Repeat with a dialog open.
- [ ] **Browser vs installed**: run the Prep-scroll and live-screen checks once in Chrome (with its dynamic toolbar) and once in the installed standalone app — `height: 100dvh` behaves differently between them.
- [ ] **J1/J2**: Import `valid-boundary-content.md`. At 100% Android font size, walk every live screen incl. the long-title pose minimal and expanded: nothing clipped, everything scrollable that should be.
- [ ] **Prep reachability** (the July 25 blocker): Prep scrolls under the finger and `Begin Class` stays visible and pinned at both font scales, in both browser and installed mode.
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

## Open question — does Android font scaling reach the app at all?

`html { -webkit-text-size-adjust: 100% }` with an all-pixel type scale may mean Chrome never enlarges Settle In's text. If so, every "125% font scale" check above is measuring nothing, and Clare's system font preference is being ignored.

- [ ] Note the app's text size on a live pose screen at the default Android font size (photograph it).
- [ ] Raise the system font size to its largest standard step. Reopen the app and photograph the same screen.
- [ ] **Did the text change size at all?** Record yes/no. This answer resolves the open triangulate node in the decision log; do not change the type scale before it is known.
