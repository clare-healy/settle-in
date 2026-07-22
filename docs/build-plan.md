# Settle In — v1 Build Plan

Status: architecture proposal, Phase 1. Open for adversarial review (GPT-5.6 / Codex) before code. On ratification, its locked choices join the decision log; the treaties it cites always outrank it.

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

The review's verdicts land in the decision log as Y/N resolutions before M1 begins.
