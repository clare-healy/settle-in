# Pass to GPT Codex — device blocker, and what it revealed

Status: a pass, not a discharge. Written July 25, 2026, immediately after shipping commit `ce8366e`.
Receiver: GPT-5.6 / Codex, with the `settle-in` repository mounted. You wrote this repo's canonical
documentation and its Phase 1 adversarial review; `AGENTS.md` binds you as before.

## The game signal

This is a second-opinion request on a fix that has already shipped, plus one finding that
retroactively weakens a large part of our verification record. Clare teaches from this app.
The fix is live because she needed to practice tonight; that urgency is why a review pass is
worth running now rather than before.

## What happened (moment-time)

Clare installed the PWA from the live origin, imported a class, and **could not start it**. Prep
would not scroll, so `Begin Class` — roughly 880px below the fold — was unreachable. She could
not get into a run at all.

Root cause, reproduced on the deployed build with her real class:

- `#app` was height-bounded only by `min-height: 100dvh`.
- Its descendant scroll regions (`.prep__scroll`, `.post__scroll`, `.reference__body`, `.import`,
  `.library`) are flex children with `overflow-y: auto` and the flex default `min-height: auto`.
  With no definite ancestor height they grew to fit their content: `scrollHeight === clientHeight`,
  so nothing to scroll internally.
- They nonetheless remained *registered scroll containers* carrying `overscroll-behavior: contain`,
  which blocks scroll chaining. A touch drag landing anywhere in the Prep body therefore moved
  nothing — not the region, not the document.

Measured on production before the fix: `.prep__scroll` 1635/1635, `Begin Class` top at y=1694 in an
812px viewport. After injecting the fix via CSSOM on that same live page: scroll region 1635 content
in a 684px viewport, `Begin Class` at y=743, visible.

The fix: a definite `height: 100dvh` on `#app` (with `100vh` fallback), `min-height: 0` on `.screen`
and every inner scroll region, plus `overflow-y: auto` on `.screen` as a safety net so a screen with
no dedicated scroll region can never clip content unreachably.

## The finding that matters more than the bug

**Every Playwright test in this repo has been running against an app with no CSS.**

The shipped CSP pins `style-src` to `'self'` plus the sha256 of the single inline critical style.
Vite's dev server delivers every CSS module by injecting `<style>` elements. The browser blocked
all of them. The Playwright suites run against the dev server. So:

- 21 flow specs, including `e2e/indicator-overlap.spec.ts`, which asserts *bounding-box geometry*
  for the wake-lock indicator "in real Chromium" — were measuring an unstyled document.
- The M4a/M4b/M5/M6 verification narrative, including my own browser walkthroughs against the dev
  server, is weaker than it reads.
- The 232 Vitest DOM tests run in happy-dom, which has no layout engine at all, so they could never
  have caught this class of defect either.

Dev now relaxes `style-src` to `'self' 'unsafe-inline'` via a `transformIndexHtml` hook applied only
on `serve`. Note the subtlety: the hash had to be *removed*, not appended to — CSP ignores
`'unsafe-inline'` in any directive that also carries a hash or nonce. The production policy is
untouched and still audited at build time.

New regression coverage: `e2e/reachability.spec.ts` asserts primary actions are actually within the
viewport and that no surface traps the scroll gesture without being scrollable, at 100% and 125%
font scale. It is mutation-tested — reverting the CSS fix makes it fail.

## What I want from you (the ends)

Four questions. The first is the one I would most like you to be hostile about.

**Q1 — How far does the unstyled-test contamination reach?**
Audit which acceptance criteria were claimed as verified but rest on layout that was never actually
rendered. My candidates: J1 (no critical clipping at 100%/125%), J2 (boundary content), J3 (48×48
targets), J5 (meaning without color), screen-states §14 (indicator never covers teaching content),
the live tap-zone geometry (20/60/20, ≥12px gesture-edge inset), and safe-area inset behavior.
Tell me which of these are now unproven, and which need a spec that would actually fail if broken.

**Q2 — Is `height: 100dvh` on `#app` safe, or did I trade one clipping bug for another?**
Attack it: Android Chrome dynamic toolbars in browser (non-standalone) context, `dvh` support and
behavior on the Pixel 6's Chrome, keyboard-open states on the Import screen's textarea, dialogs, and
the live surface at 125% font scale. I added `.screen { overflow-y: auto }` as a net; say whether
that is sufficient or whether it introduces nested-scroll ambiguity that violates Principle 5
(predictability on screen mirrors predictability in cueing).

**Q3 — Is a dev-only CSP divergence the right call?**
It means dev and the e2e suites no longer exercise the real production policy — the same class of
gap that just bit us. Alternatives: serve CSS as linked files in dev so the strict policy holds; or
inject the CSP only at build time and add an explicit production-policy smoke test in the PWA suite
(which runs against a real build). Recommend one, with the trade-off named.

**Q4 — What else in this codebase is verified only by tests that cannot see the thing they assert?**
Generalize the failure mode: assertions whose oracle is structurally blind (happy-dom geometry,
`fake-indexeddb` durability, stubbed `navigator.wakeLock`, CI offline emulation). We already ruled
CI offline is smoke-only. Which other claims deserve the same demotion, and where is the cheapest
real oracle?

## What I am NOT asking for

- Do not re-litigate the four Phase 1 architecture verdicts (`yaml`, `idb`, no framework, CI
  fidelity). They are settled in `docs/decision-log.md`.
- Do not propose a UI framework migration or a redesign of the screen contracts.
- Do not edit files. This is a review pass; verdicts return as prose and I will resolve them into
  the decision log as Y/N entries.
- Do not touch `archive/original-concept/`.

## Scope and rules of engagement

Same as the Phase 1 review: cite the document section or acceptance-test ID each finding rests on,
name the End/Principle/invariant threatened, rank findings **blocker / material / minor**, and mark
any platform behavior you are not certain of as **[UNVERIFIED]** rather than asserting it. Where a
finding demands a change, state the smallest change that resolves it. An empty category is a
result — say so explicitly.

## Cognitive lineage

- The bug was found by Clare, on her own device, doing the thing the app exists for. Field evidence
  outranks our test suites; this is the product spec's field-learning rule doing its job.
- Diagnosis and fix: Claude Opus 4.8, orchestrating, July 25, 2026 — reproduced against the live
  deployed origin via CSSOM injection rather than reasoning from the source.
- The repo's canonical docs, schema, and the Phase 1 adversarial review are yours (GPT-5.6/Codex,
  July 21–22, 2026). The build was executed by Claude Opus agents under written work orders.
- Relevant reading, in order: `docs/product-spec.md` (Principles 2, 5, 7), `docs/screen-states.md`
  (§4 Prep, §14), `docs/design-system.md` (§ Layout), `docs/build-plan.md` (§ Test strategy and the
  adversarial-review amendments), `docs/acceptance-tests.md` (section J), `docs/decision-log.md`.

## The next move

Clare carries your response back to me. Verdicts and blockers land in `docs/decision-log.md` as
yes/no entries before further code changes. If Q1 shows the contamination is broad, the next
milestone is a verification-repair pass, not new features — and that should happen before the
studio rehearsal, not after.
