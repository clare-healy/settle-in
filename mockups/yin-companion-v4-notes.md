# Yin Companion — v4 Wireframe Notes

Companion to `yin-companion-v4.source.dc.html` (Claude Design source) and its portable exports.
Drop this folder's contents into the repo at `yin-app/mockups/`.

> These wireframes demonstrate hierarchy and visual intent. Per `mockups/README.md` and
> `AGENTS.md`, they do **not** override product invariants, timing equations, data rules,
> responsive behavior, accessibility, or the screen-state contract. Where a wireframe and a
> canonical document differ, the document wins.

## Files

| File | What it is |
|---|---|
| `yin-companion-v4.source.dc.html` | Claude Design source for the full set (needs the Claude Design runtime) |
| `yin-companion-v4.overview.html` | Self-contained static overview — opens in any browser, no runtime dependency |
| `yin-companion-v4.board.html` | Contact-sheet board (references the PNGs) — the source of `overview-board.png` |
| `png/*.pixel6.png` | One portable PNG per screen at the 412 × 915 design canvas |
| `png/overview-board.png` | The whole flow on one board |
| `yin-companion-v4-notes.md` | This file |

## Frame index

Source date: 2026-07-22 · Design canvas 412 × 915 CSS px · Android font scale 100%.

| ID | Screen | §screen-states | PNG |
|---|---|---|---|
| A1 | First launch / empty library | §1 | `png/a1-empty-library.pixel6.png` |
| A2 | Import input | §2 | `png/a2-import-input.pixel6.png` |
| A3 | Import blocking errors | §2 | `png/a3-import-errors.pixel6.png` |
| A4 | Import confirmation | §2 | `png/a4-import-confirmation.pixel6.png` |
| A5 | Home / upcoming class | §3 | `png/a5-home.pixel6.png` |
| A6 | Library list | §13 | `png/a6-library-list.pixel6.png` |
| A7 | Class detail | §13 | `png/a7-class-detail.pixel6.png` |
| B1 | Prep | §4 | `png/b1-prep.pixel6.png` |
| B2 | Grounding · minimal | §5 | `png/b2-grounding-minimal.pixel6.png` |
| B3 | Grounding · expanded | §5 | `png/b3-grounding-expanded.pixel6.png` |
| C1 | Transition | §7 | `png/c1-transition.pixel6.png` |
| C2 | Pose · minimal · long-title stress | §6 | `png/c2-pose-minimal-longtitle.pixel6.png` |
| C3 | Pose · expanded · overflow stress | §6 | `png/c3-pose-expanded-overflow.pixel6.png` |
| C4 | Two-minute callout in a pose | §8 | `png/c4-twomin-callout.pixel6.png` |
| C5 | Savasana | §9 | `png/c5-savasana.pixel6.png` |
| D1 | Run Recovery | §11 | `png/d1-run-recovery.pixel6.png` |
| D2 | Leave Class guard | §10 | `png/d2-leave-guard.pixel6.png` |
| D3 | Wake lock unavailable | §14 | `png/d3-wakelock-unavailable.pixel6.png` |
| D4 | Post-Class Notes | §12 | `png/d4-post-class-notes.pixel6.png` |
| E1 | Live-screen interaction map (annotated) | global | `png/e1-interaction-map.pixel6.png` |
| E2 | Visual-system sheet | design-system | `png/e2-visual-system.pixel6.png` |

## Canvas & safe-area assumptions

- Each screen is drawn at **412 × 915 CSS px** (Pixel 6 portrait), with **no device bezel**.
- **Top safe area ≈ 30px** reserved for the Android status bar (shown faint — it is system UI, not app chrome).
- **Bottom safe area ≈ 24px** reserved for the gesture-navigation pill.
- Live navigation zones are inset **≥ 12px** from the physical edges (E1).
- The fixed canvas is a *drawing* convenience for the wireframes only. The build must stay
  responsive to the real viewport and pass `implementation-contract.md` → Responsive behavior:
  100% and 125% Android font scaling with no critical clipping, `env(safe-area-inset-*)`, no
  reliance on this exact pixel box.

## Interaction notes

- **Live tap map (E1):** Previous 20% (left) · Reference 60% (center, opens expanded) · Next 20% (right).
  Effective targets ≥ 48 × 48 px. Affordances are subtly persistent — no memorized invisible gesture.
- **System Back** order: close dialog → close expanded reference → open guarded Leave Class. It never means Previous Pose.
- **Destructive/run-ending** actions (Begin's another-run check, Leave/End, Finish, restore-replace, changed-revision import) take a deliberate second step. Ordinary forward/back navigation does not.
- **Drift** is a cool indigo chip with Legible Indigo text; shown as `on plan` / `+N min` / `−N min`, never red or animated (B2, C2, C4, D3).
- **Next preview** uses Lotus Blush. On a bilateral Side 1 (C2) the immediate destination *Side 2* is bold and separated from the following authored pose, so Side 2 can never look skipped.
- **Two-minute message:** one ~3s candlelight fade, then static (C4, C5). Outside Savasana it is a persistent lower callout that sits *below* clock/cue/next and obscures nothing.

## Scroll behavior

- **Scrolling frames:** B1 Prep (upper region scrolls; Begin Class pinned in a fixed footer, never clipped), B3 Grounding expanded, C3 Pose expanded, D4 Post-Class Notes. All use `overflow:auto`; authored cue copy is never in an `overflow:hidden` container (J1).
- **Non-scrolling live frames:** B2, C1, C2, C4, C5, D3 — single-glance layouts sized to the canvas.
- Expanded references keep a compact **sticky header** (pose/segment · wall clock · planned window · elapsed) while the body scrolls (B3, C3).

## Accessibility concerns discovered

1. **Savasana inactive steps** are drawn at ~40% opacity (C5). The design system warns against
   low opacity as the *only* state signal — the current step is also larger and marked with a
   dot, so state is not opacity-only. Still, verify the 40% steps remain legible at arm's length
   in real studio light; raise the floor if they wash out.
2. **Eyebrow labels** appear at 10–10.5px in a few frames. The design system floor for eyebrow
   labels is 11–12px. Bump all eyebrow labels to ≥ 11px in the build.
3. **Composited contrast on the drift chip:** Legible Indigo text sits on a translucent indigo
   surface over Pond Charcoal. Confirm the *composited* combination meets AA on device (the
   token table lists opaque values only).
4. **Reduced motion:** the source honors `prefers-reduced-motion` by disabling the wake/settle
   animation. Confirm the wake message still resolves to its visible static state when motion is reduced.
5. **Status-bar / gesture representations** are illustrative; the real system UI is owned by
   Android and must not be recreated as app chrome.

## Genuine conflicts between canonical documents

None blocking. The documents are internally consistent for this set. Two points worth a note
rather than a conflict:

- **36-character title (C2):** `class-format.md` fires a *warning* when a pose name *exceeds* 36
  characters, while `acceptance-tests.md` J2 requires a *36-character* title to render without
  collision. These are compatible: 36 is the render boundary and does not itself warn. The stress
  pose is exactly 36 characters to test layout at the boundary without tripping the warning.
- **Post-Class row granularity (D4):** the wireframe collapses Reclined Twist's two sides into one
  row for space. The contract implies per-segment/side rows; the build should list each teaching
  segment/side separately. This is a wireframe simplification, not a doc conflict.
