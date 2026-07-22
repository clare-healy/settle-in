# Settle In — v1 Build Plan

Status: ratified for M1, as amended. The Phase 1 adversarial review (`docs/phase-1-adversarial-review.md`, July 22, 2026) returned YES on triangulate nodes 1–3, NO on node 4, and seven blockers; every verdict and blocker is resolved in the decision log and folded into the treaties and the amendments section at the end of this document. The treaties it cites always outrank it.

## Architecture stance

Settle In is a small state machine wearing a quiet interface. The plan is deliberately boring: the fewer moving parts between a tap and a durable timestamp, the more trustworthy the record.

- **Language and tooling:** TypeScript (strict) built with Vite. No UI framework — screens are simple, transitions are explicit, and the run surface renders at most a dozen values. A framework would add bundle weight and update churn without earning it here.
- **Runtime dependencies (exactly two):**
  - `yaml` — parsing fenced YAML blocks with the core schema only; custom/executable tags rejected; duplicate keys are errors (treaty requirement). Hand-rolling YAML is where parsers grow security holes; this is a dependency worth carrying.
  - `idb` — the ~1 KB promise wrapper over IndexedDB. Raw IndexedDB event plumbing is error-prone precisely where the persistence treaty is strictest.
- **Markdown container parsing is ours:** the class format is not general Markdown — it is front matter + one H1 + ordered H2 headings + one fenced YAML block each. A purpose-built line-based splitter (~100 lines) gives exact source-line error reporting and eliminates every HTML-rendering path. Imported content is only ever placed into the DOM as text nodes; `innerHTML` never receives it.
- **Service worker is hand-written:** a versioned precache list, cache-first serving, and explicit waiting-update deferral while a run is active (acceptance A5). Workbox would obscure the one behavior the treaty cares most about.

## Module map

Dependency direction flows downward; nothing below imports from above.

```text
src/
├── schema/    Types + constants: ClassDefinition, ExpandedSegment,
│              RunSession, RunEvent, backup payload, schema versions.
├── parser/    Container split → YAML block parse → normalize →
│              validate (blocking vs warning, segment/field/line) →
│              ClassDefinition + source_hash (newline-normalized).
├── model/     Pure functions of (definition, events, now):
│              plan expansion, planned offsets, re-anchoring,
│              elapsed, drift, hard-close math, status derivation.
│              No I/O, no Date.now() — everything takes a Clock.
├── store/     idb schema + migrations (forward-only, versioned),
│              write-then-ack persistence, backup export/restore
│              (merge = union by class_id / source_hash / run_id).
├── run/       The run state machine: teaching-state actions append
│              events and persist BEFORE the UI acknowledges (H1);
│              single-active-run guard; recovery from durable state.
├── export/    Original-markdown passthrough, as-taught generator
│              (Export Schema v1 golden-tested), library backup JSON.
├── ui/        State-driven screen router (no URL routing), screens
│              per the screen-state treaty, tap zones, Android back
│              interception, wake-lock manager, reduced-motion.
└── sw.ts      Precache manifest injected at build; update deferral.
```

### Clock

```ts
interface Clock { now(): Date }
```

Injected everywhere time is read. Production uses the wall clock; tests use a controllable clock (D1–D9 become pure unit tests). Display values are always recomputed from durable timestamps — a 1 Hz render tick refreshes the screen, and `visibilitychange` triggers an immediate recompute plus wake-lock reacquisition, so a delayed or throttled tick can never corrupt state (D7).

### Event sourcing

The ordered event log is the single source of truth for a run. Durations, statuses, and recovery state are derived, never stored redundantly. Every teaching-state action follows the same path: append event → persist transactionally → then update the UI. If persistence fails, the UI shows the quiet failure state rather than pretending.

## Build and deploy

- Vite with `base: '/settle-in/'`; deployed by GitHub Actions to GitHub Pages on push to `main`. The workflow builds, runs all automated tests, and only deploys on green.
- Production origin: `https://clare-healy.github.io/settle-in/` (permanent per the implementation treaty).
- Fonts: Hanken Grotesk + Spectral subset to WOFF2, bundled with their OFL license files. Budget: application shell under 150 KB before fonts; fonts under 250 KB combined. Nothing loads from a third-party origin (A4).
- The service worker precache manifest is generated at build so cache versioning is automatic; activation is gated on "no active run" (A5).

## Test strategy, mapped to acceptance tests

| Layer | Tooling | Covers |
|---|---|---|
| Parser + validation | Vitest against `fixtures/` | C1–C9, safe-parsing cases (C4) |
| Timing + expansion | Vitest + controllable Clock | D1–D9, E1–E3 eligibility logic |
| Status + export | Vitest golden files | I1, I4, as-taught Export Schema v1 |
| Persistence | Vitest + `fake-indexeddb` | H1, H4–H6, I5 round trip, migrations |
| Flows + recovery | Playwright (Chromium, Pixel 5 viewport) | F1–F7, H2–H3, E4, guarded exits |
| Offline + install | Playwright offline emulation in CI; physical Pixel 6 for truth | A1–A5 |
| Silence + platform | Static grep gate (no Audio/vibrate/Notification APIs in shipped code) + device checklist | B1–B2 |
| Dim-room + access | Device checklist at 100%/125% font scale; studio rehearsal | J1–J8, B3, G1–G4 |

A checked-in `docs/device-checklist.md` will script the physical passes so they are repeatable, not vibes.

## Milestones

Each milestone ends green, committed, and reviewable. This is the README vertical slice with review seams.

1. **M1 — Parse and validate.** Parser, normalizer, validator; all fixtures pass (C1–C9). *Review seam: parser security.*
2. **M2 — Time model.** Expansion, re-anchoring, drift, hard-close, status derivation, all against the controllable clock (D1–D9). *Review seam: timing math — highest correctness risk.*
3. **M3 — Store and run machine.** Persistence, event log, single-run guard, recovery derivation (H1, H4–H6).
4. **M4 — Live surfaces.** Prep → Grounding → Pose/Transition → Savasana → Post-Class → finish; tap zones; back handling; wake message (E, F).
5. **M5 — Import/export/library.** Import flow, library, as-taught export, backup round trip (C8, I1–I6).
6. **M6 — PWA shell.** Manifest, icons, service worker, offline, update deferral (A1–A5); deploy workflow live.
7. **M7 — Device truth.** Pixel 6 install, airplane-mode class, font-scale passes, then studio rehearsal (J7/J8). Field observations recorded before any scope talk.

## Risks and mitigations

- **Wake lock is best-effort** (platform may refuse or drop): monitored, re-requested on visibility, honest quiet indicator; never promised (G1–G3).
- **Storage eviction:** request `navigator.storage.persist()` after first import; library-only warning if declined; backup export is the real safety net.
- **Android back:** a history-entry sentinel intercepts system back during a run; if the platform swallows it, the run still recovers durably on relaunch — recovery is the backstop for every interruption path.
- **Service-worker update mid-run:** waiting worker is never activated during `active_run`; integration-tested (A5).
- **Battery over a 60-minute lit screen:** rehearsal measures real drain; the design system already forbids expensive effects.

## Open triangulate nodes for adversarial review

1. `yaml` library vs hand-rolled minimal YAML subset — proposed: library (security surface argument runs both ways; reviewer should attack this).
2. `idb` vs raw IndexedDB wrapper of our own — proposed: `idb`.
3. No framework vs Preact — proposed: none; attack if the screen inventory looks underestimated.
4. Playwright offline emulation fidelity for A2/A3 — proposed: CI approximation + physical truth on device; is that gap acceptable pre-pilot?

The review's verdicts land in the decision log as Y/N resolutions before M1 begins. *(Resolved July 22, 2026: nodes 1–3 YES, node 4 NO — see below.)*

## Adversarial review amendments (July 22, 2026)

These amendments are binding on the build. Where they touch treaty behavior, the treaties were amended in the same change and remain the authority.

- **YAML hardening.** Each fenced block parses to an AST with the core schema; directives, tags, anchors, aliases (`maxAliasCount: 0`), multiple documents, non-string keys, and non-finite scalars are rejected before conversion; duplicate keys block at every depth.
- **Parser budgets and total grammar.** Canonical input caps, enforced before parsing: 512 KB file, 10,000 lines, nesting depth 8, 5,000 YAML nodes, 8 KB per scalar. The container splitter is a total grammar: BOM/newline normalization, every line consumed, exact heading/fence adjacency, stray content rejected, YAML-relative offsets mapped back to source lines, and honest "line unavailable" reporting when attribution is impossible. Fuzz tests near every cap and malformed-container cases join M1.
- **Strict durability.** Run-start, teaching-state, wake-message, finish/abandon, and note transactions use `durability: "strict"` and await completion before UI acknowledgment. Current-state fields are transactional projections written atomically with their events; projection-rebuild equivalence is tested (M3).
- **Input serialization.** A single-flight action queue serializes teaching-state actions; navigation is disabled until the pending transaction commits. Double-tap, rejection, and retry tests join M3 (acceptance F9).
- **Clock policy.** Events carry wall + monotonic samples and an execution identity; elapsed uses monotonic deltas within an execution; discontinuities append `clock_discontinuity_noted` and never render as negative or alarming values. Forward and backward clock-change tests join M2. `hard_close_at` is computed once at Begin and persisted.
- **Service-worker lifecycle.** A waiting worker never activates while a client with an active run is open; after process death it may activate, so recovery is version-crossing and migrations run before the recovery screen. Close/reopen-with-waiting-update-and-active-run is an M6 integration test. Precache completeness is audited against the production asset graph; installation fails atomically on any missing asset; browser tests intercept and fail every cross-origin request; a self-only CSP ships with the app.
- **Persistence reality.** `navigator.storage.persisted()` is rechecked on launch. Real-Chromium tests with a persistent profile cover blocked upgrades, quota failure, forced browser termination, and relaunch; `fake-indexeddb` is unit-level only. A verified backup is required before the pilot.
- **Restore atomicity.** Backups are fully parsed and validated before any write transaction opens; merge/replace applies atomically. Corrupt, future-version, identity-colliding, and truncated backups are fixture-tested (M5).
- **Test-gate honesty (node 4, NO).** CI offline emulation is smoke coverage only and is never reported as acceptance evidence. A1–A3 and A5 can only be marked passed by the scripted physical Pixel 6 checklist; M6's exit criterion is amended accordingly, and M7 owns the device matrix — wake-lock denial, release-while-visible, background/foreground, screen lock, battery saver, low battery, launcher cold start, standalone export, and update-during-recovery.
- **D8/D9.** Pure model tests are retained and supplemented by run-state and rendered-screen integration tests before D8/D9 are claimed.
- **Boundary fixture.** `fixtures/valid-boundary-content.md` pins J2's 36/150/280-character boundaries and feeds automated screenshots plus the physical 100%/125% font-scale passes.
- **Product resolutions ratified by Clare (July 22, 2026):** the authored `wake_message` is authoritative on screen (warning above 90 characters); non-Tuesday or non-19:00 files warn, never block; revisited segments display `revisited` instead of a drift value; navigation stays open after 8:00 — the hard close ends teaching, not the record.
