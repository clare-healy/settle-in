# Decision Log

This log records material product and implementation decisions. Canonical behavior lives in the subject-specific documents; this file preserves decision context.

The log operates on the yes/no/triangulate primitive. Each entry records a question that was resolved **yes** or **no**, or is held open as **triangulate**. Open triangulate nodes are triangulated against the ends, means, and principles in `docs/product-spec.md` until they resolve; unresolved nodes are listed at the top of the log so they cannot silently disappear.

## Open triangulate nodes

- **Android font scaling does not reach the app** (opened July 25, 2026; evidence in, ruling pending). Clare ran the three-step Pixel observation on July 25: raising Android's system font size to its largest standard step changes Settle In's text size **not at all** — `text changed: no`. The node stays open because the ruling is Codex's; nothing in the type scale or in J1/J2/J10's wording changes until it returns. Original framing follows. `html { -webkit-text-size-adjust: 100% }` plus an all-pixel type scale means Chrome on Android may not enlarge Settle In's text when Clare raises her system font size. If so, acceptance J1/J2/J10's "125% font scale" checks are measuring something the device never actually does, and a real accessibility need goes unserved. Triangulate against Principle 2 (glance, do not read) and Principle 4 (legibility outranks decoration) before changing the type scale, since a relative-unit scale would alter every screen Clare has already learned to read. Needs a Pixel observation first: does raising the system font size move the app's text at all? Route to Codex with that evidence.

## July 21, 2026 — Context-package scope

Decision: reorganize and strengthen the build context before writing application code.

Reason: the initial concept was strong in purpose and visual direction but left schema, timing, recovery, platform, and edge-state choices to the builder.

## July 21, 2026 — Hard class close

Decision: 8:00 PM is a hard end, even if class begins late or runs behind the re-anchored plan.

Consequence: the savasana wake message is tied to 7:58 PM on the run date, not to planned savasana progress. At 8:00 the app informs but does not automatically finish.

## July 21, 2026 — Bilateral duration

Decision: authored duration is per side.

Example: `Sleeping Swan` with `duration_per_side_min: 4` means four minutes on the right followed by four minutes on the left, eight minutes total.

Reason: this interpretation matches Clare's teaching intent and makes planned timing explicit.

## July 21, 2026 — Actual timing record

Decision: actual durations are derived from timestamped teaching-state events.

Consequence: Post-Class Notes does not ask Clare to manually classify long or short. Human input is reserved for skips, substitutions, and room observations.

## July 21, 2026 — Static PWA packaging

Decision: replace the literal single-file constraint with a small static Progressive Web App bundle served over HTTPS and usable offline after installation.

Reason: a manifest, service worker, locally bundled fonts, and icons strengthen installability and offline reliability. This is a change of technical means, not product ends. The package must remain small, local-first, and silent.

## July 21, 2026 — Authoring format

Decision: retain Markdown as the human-facing class format.

Consequence: constrained YAML front matter and fenced YAML segment blocks provide an unambiguous parse target. The app normalizes and validates the result into a versioned internal object.

## July 21, 2026 — AI terminology and attribution

Decision: canonical workflow language uses `AI assistant` rather than binding future authoring to one model.

Attribution: preserve Claude and Claude Design's original concept work and explicitly record GPT-5.6 / Codex's triangulation and build-context contribution in `COGNITIVE-LINEAGE.md`.

## July 21, 2026 — Original artifacts

Decision: move all initial documents and mock-up source unchanged to `archive/original-concept/`, with checksums. The unprefixed archive name avoids the parent repository's `_archive/` ignore rule so the provenance files remain commit-visible.

Consequence: the archive provides provenance but does not compete with the canonical v4 package.

## July 21, 2026 — Physical target

Decision: Pixel 6 is the v1 physical target. Current stable Chrome and the device's installed Android version are used for release testing.

## July 21, 2026 — Pending visual inputs

Decision: Clare will add studio reference photographs to `reference-photos/` and may commission the additional requested wireframes through Claude Design.

Consequence: these inputs refine the implementation but do not block the now-resolved schema, timing, persistence, and state treaties.

## July 21, 2026 — Treaty naming convention

Question: should binding technical documents be called contracts? **No.**

Decision: this is a principles-based computing build; binding documents use the treaty convention. `implementation-contract.md` became `implementation-treaty.md` and all in-repo uses of "contract" became "treaty". Archived provenance files keep their original wording.

## July 21, 2026 — Yes/no/triangulate decision primitive

Question: adopt Y/N/T as the operating primitive for this log and for missing build decisions? **Yes.**

Decision: decisions are framed as yes/no questions; unresolved matters are held as triangulate nodes and triangulated against the product ends, means, and principles until they resolve. `AGENTS.md` binds implementation agents to this.

## July 21, 2026 — As-taught export schema

Question: does the end "each taught class strengthens future class construction" have a concrete means? **It does now.**

Decision: the as-taught export is a versioned schema (Export Schema v1 in `docs/class-format.md`): front matter identifying class, revision, and run; one ordered segments block with planned/actual seconds and derived statuses; the room note. Pose recency reaches future authoring through accumulated exports read by the authoring assistant — v1 has no in-app recency view. Timing-status thresholds (greater of 30 seconds and 15% of planned) are v1 defaults tunable under the field-learning rule.

## July 21, 2026 — Integrated system: app ⇄ Yin Flow State

Question: is the Claude Chat project "Yin Flow State" part of this product? **Yes.**

Decision: the app and the authoring project form one integrated system. The project's instructions live canonically in `docs/yin-flow-state-instructions.md`; any schema change updates both sides in the same change, even when the chat side is applied manually by Clare. The project carries `class-format.md` and the valid fixture as project knowledge.

## July 21, 2026 — Run begun after hard close

Question: does a run begun at or after 8:00 PM (a rehearsal) need special handling? **No.**

Decision: the wake message and the `8:00 · hard close` indicator are simply present from the start; re-anchored planned windows still follow the actual start time. Defined behavior, no rehearsal mode. Ratified by Clare.

## July 21, 2026 — Wireframes refine, they do not gate

Question: does an incomplete mock-up set block the build? **No.**

Decision: the build implements screens from the screen-state treaty and design system directly; on-device verification plus the studio rehearsal is the visual lock. Claude Design frames are prioritized for the four highest-visual-risk states (pose minimal with long title, pose expanded with overflow, Savasana, two-minute callout outside Savasana).

## July 21, 2026 — Restore merge semantics

Question: can a merge restore ever overwrite local data? **No.**

Decision: merge is deterministic union by identity — classes by `class_id`, revisions by `source_hash`, runs by `run_id`; existing identities are skipped, never overwritten. Only explicit replacement is destructive.

## July 21, 2026 — Warning path pinned

Decision: `fixtures/warning-short-plan.md` (40-minute valid plan) pins the warn-without-blocking behavior, with expectations in `fixtures/expected-validation-errors.md` and acceptance test C9.

## July 21, 2026 — Studio photographs delivered

Decision: four reference photographs were added to `reference-photos/` with descriptive view-and-lighting names. They inform palette and light only; the design system's rule against in-app spiritual iconography stands.

## July 22, 2026 — App name: Settle In

Question: is the app named Settle In? **Yes.**

Decision: chosen by Clare from candidates drawn from the three yin principles and her own cue language — it is the phrase a yin teacher says as a pose begins, and the `settling` field lives in every pose block. Working title through v4 was Yin Class Companion; the archive and lineage retain the historical name. Repo and hosting path use `settle-in`; backups are named `settle-in-backup-YYYY-MM-DD.json`.

## July 22, 2026 — Manifest identity

Question: is the install identity defined? **Yes.**

Decision: manifest name and short name `Settle In`; icon is a minimal taper-candle silhouette (Taper Wax + Candlelight Amber on Pond Charcoal), chosen by Clare from her studio's actual taper candles; theme and background color `#14181A` so nothing bright ever flashes in the dim studio. Canonical details in `docs/design-system.md`.

## July 22, 2026 — Hosting: GitHub Pages

Question: where does the app live permanently? **GitHub Pages**, chosen by Clare.

Decision: served from the public `settle-in` repository. Public is acceptable because real classes never leave the device and fixtures are invented. The origin is permanent once the first real class is imported, because browser storage is origin-bound; any future move requires a deliberate backup export/restore outside class time. Canonical details in `docs/implementation-treaty.md`.

## July 22, 2026 — Standalone repository

Question: does this project get its own git repository inside the vault? **Yes.**

Decision: `yin-app/` is initialized as a standalone git repository (GitHub name `settle-in`), following the vault's embedded-repository convention. It is not WEAVE-governed; `CLAUDE.md` in this repo overrides the vault orientation for work here.

## July 22, 2026 — Photo privacy scrub before publication

Question: may the studio photographs enter the public repository as taken? **No.**

Decision: before the first push, all EXIF metadata (including GPS coordinates) was stripped from the four reference photographs, and the QR codes and instructor names on the tip sign were blurred in the altar-shelf photo (GPT-5.6 flagged the GPS metadata; Claude flagged the sign). The root commit was rewritten so unscrubbed copies never exist in public history. Unmodified originals remain on Clare's phone.

## July 22, 2026 — Phase 1 build plan proposed

Decision: `docs/build-plan.md` proposes the v1 architecture — vanilla strict TypeScript + Vite, exactly two runtime dependencies (`yaml`, `idb`), a purpose-built container parser with text-only rendering, hand-written service worker, injectable Clock, event-sourced runs, and seven milestones mapped to the acceptance tests. Held as an open triangulate node pending adversarial review; not yet locked.

## July 22, 2026 — Project instructions v2: teaching corpus triangulated in

Question: do the Yin Flow State project instructions carry Clare's full teaching framework, not just the schema rules? **Yes, now.**

Decision: `docs/yin-flow-state-instructions.md` v2 merges Clare's existing project instructions (four-phase cueing architecture, accessibility principles, sequence-building workflow, Bethany's Monday review, cueing style, key learnings) with the app system. Material triangulations: the four-phase cueing architecture maps onto the schema's cue fields (entry/target, settling, midpoint, exit); Clare's nine-beat savasana arc maps into the schema's six steps without a schema change; the instructor guide remains the full script for design, rehearsal, and Bethany review while Settle In replaces it as the in-class reference; Clare's 5–6 pose ceiling is carried as a stricter authoring rule than the schema warning; the relational late start is honored by re-anchoring. Nothing from Clare's teaching instructions was dropped.

## July 22, 2026 — Adversarial review prompt canonized

Decision: the Phase 1 review prompt for GPT-5.6 lives at `docs/adversarial-review-prompt.md` (six attack surfaces, evidence-citation rules, [UNVERIFIED] discipline, severity-ranked deliverable). Reusable at later review gates; review verdicts return here as Y/N entries before M1.

## July 25, 2026 — Q5a: the two-minute message lives only in Savasana

Question: should the wake message appear on any live screen at 7:58? **No.** Question: should both eligibility and rendering change, rather than rendering alone? **Yes.** Question: should a rehearsal begun after 8:00 suppress the message entirely? **No.**

Decision: the message is gated on two conditions — temporally eligible at `hard_close_at − 120s`, and displayed only while the current segment is Savasana. It never appears on Grounding, a pose, or a transition, at any time. `wake_message_shown` persists immediately before the first Savasana render, not when the clock passes 7:58 on another screen; rendering-only gating was insufficient because `app.ts` wrote the event on time alone. A post-hard-close rehearsal therefore shows nothing until Savasana, then shows it once. Hard-close indicator behavior is unchanged.

Origin: Clare's first practice run on the Pixel — "the text at the bottom is distracting." Because she practised after 8:00 PM, the message was visible from the first segment onward, which is the ratified after-hard-close behavior colliding with an always-visible callout. Field evidence outranks the prior screen contract (product spec, field-learning rule). Reviewed and confirmed by GPT-5.6/Codex.

Reconciled: product spec (During class 6, invariants, capabilities, success measures), README invariant, implementation treaty (§ Hard close and savasana signal), screen-states §8 and §9, class-format `wake_message` wording, Yin Flow State instructions, acceptance E1–E8 (E3 rewritten to prove no callout *and no event* outside Savasana; E8 added for the rehearsal path).

## July 25, 2026 — Q5b: no blue platform tap highlight

Question: is the blue flash the Android default tap highlight? **Yes**, confirmed. Question: suppress it globally? **Yes.**

Decision: `-webkit-tap-highlight-color: transparent` is applied globally. Because `.zone` had no `:active` state at all, suppression alone would have left the full-height live zones with no feedback, so a static warm pressed state is added — a low-alpha Candlelight Amber inset edge with slight affordance brightening, never a full-zone fill and never an animation (design system § States and feedback; Principle 4 keeps indigo drift as the system's only cool note). Text selection stays enabled; `::selection` is treated as a separate potential blue source and only recolored if Pixel testing shows it matters. New acceptance J9; strict-production browser coverage asserts the cascade and pressed style, and the device checklist proves the actual platform flash is gone.

## July 25, 2026 — Q5c: Post-Class becomes a single reflection

Question: remove the per-segment rows and the manual Skipped/Substituted controls? **Yes.** Question: bump the export schema version? **No.**

Decision: Post-Class renders one generous native multiline `textarea` and nothing to curate. The draft persists on every `input` event — not merely `change` — so a Gboard dictation survives backgrounding, a lock, or process death mid-sentence; no keystroke interception. Clare's reasoning is a realistic account of her own behavior after teaching: she will speak a reflection into her phone, and will not review fifteen segments line by line.

Consequences ratified with it:

- A segment with **zero visits on a completed run now derives `skipped`**, not `short`. This reverses the July 22 M2 ruling, whose stated justification was that "Post-Class invites the correction" — with the correction retired, that reasoning no longer holds. Entered-but-brief segments still derive `short`.
- Export Schema v1 is **unchanged**. Derived actuals, statuses, and `substituted_with` are retained for honest history and for runs recorded before the correction UI existed; nothing in the current app sets `substituted_with`. Because no schema changed, no version bump and no integrated-system schema migration are owed — though the Yin Flow State instructions were still updated to describe statuses as derived/legacy and to weight Clare's dictated reflection above the timing rows.
- Acceptance **I2 is retired**; **I1** is rewritten around the persistent reflection UI and retained export actuals; **I4** is strengthened with fixtures for automatic skip, entered-but-brief, and historic substitution.

## July 25, 2026 — Q5 implementation questions resolved

Three questions raised by the implementing agent, resolved by the orchestrator:

- Does an **abandoned** run derive automatic skips too? **No.** The treaty says "completed", and the reading is right on its merits: an abandoned run did not skip its remaining poses — it ended. Marking them `skipped` would put a teaching claim in the record that never happened, which Principle 6 forbids. Auto-skip derivation gates on `run_finished` only; abandoned runs behave exactly as before.
- Should the **strict-production suite** reach Savasana and the wake message deterministically? **Yes, as a follow-up, and not via a new fixture.** The production build correctly has no dev clock seam, but Playwright's own clock emulation (`page.clock`) works against the built artifact without one. Until that lands, the strict suite's wake coverage is incidental (it happens to be exercised when the suite runs after 20:00); E3 and E8 are proven deterministically in the dev-server flow suite, which does have the seam.
- Does Android font scaling actually reach the app? **Unresolved — recorded as an open triangulate node above.** It is a pre-existing condition, named in no treaty, and it decides whether the 125% checks mean anything on device. It needs a Pixel observation before anyone changes the type scale.

## July 25, 2026 — Verification repair gate

Question: may prior dev-server geometry results stand as evidence? **No.**

Decision: every layout-dependent result recorded before July 25, 2026 is void, because the production CSP blocked Vite's dev-server style injection and the Playwright suites — the only tests with a real layout engine — were asserting against an unstyled document. Demoted to unproven: J1–J4, J6, the layout portion of J5, the §14 indicator geometry, the live 20/60/20 zone ratios and gesture insets, safe-area behavior, and all prior scroll-reachability evidence. J7/J8 were always device-only and remain unproven.

The dev CSP relaxation stays, but only as Vite flow wiring — it is never evidence. Re-proof comes from a new strict-production Playwright project running against the actual built artifact under the real production CSP, which asserts the stylesheet is present and applied before measuring anything, and covers: Prep and reference reachability with no dead contained scroller, touch-target sizes, zone ratios and gesture insets, indicator non-overlap, and the long boundary fixture. The Pixel 6 remains the acceptance authority for font scaling, safe areas, gestures, keyboard-open Import, dialogs, browser versus installed mode, tap highlight, wake lock, and dim-room use.

New acceptance **J10** covers a risk Codex raised: `.live` and `.live__stage` are `overflow: hidden`, so the `.screen` scroll safety net cannot rescue a live screen that overflows at 125% font scale, with a long title, with the wake-lock indicator present, or on Savasana. Any demonstrated clipping is to be fixed by reflowing the live hierarchy, never by making the live tap surface generically scrollable.

## July 22, 2026 — Adversarial review verdicts

The Phase 1 review (`docs/phase-1-adversarial-review.md`) ruled on the four open nodes:

- `yaml` library? **Yes**, with AST hardening (no directives/tags/anchors/aliases, `maxAliasCount: 0`, string keys, finite scalars, duplicate keys blocked at depth).
- `idb` wrapper? **Yes**, with strict IndexedDB durability for teaching-state transactions — awaiting `tx.done` under relaxed durability is not durability.
- No framework? **Yes**, conditional on one centralized renderer/dispatcher, deterministic focus and teardown, and state-transition tests.
- CI offline emulation as A2/A3 acceptance evidence? **No.** CI is smoke coverage; A1–A3/A5 pass only on the scripted physical Pixel 6 checklist.

## July 22, 2026 — Blocker resolutions (technical)

All seven review blockers are resolved and folded into the treaties and the build plan's amendments section:

- **A5 semantics:** a waiting service worker never activates while a client with an active run is open; after process death it may activate, so recovery is version-crossing and migrations run before the recovery screen.
- **Durability:** teaching-state, run-start, wake-message, finish/abandon, and note transactions use `durability: "strict"` and complete before UI acknowledgment; current-state fields are transactional projections of the event log with tested rebuild equivalence.
- **Clock discontinuities:** events carry wall + monotonic samples and an execution identity; elapsed uses monotonic deltas within an execution; discontinuities are noted quietly and never render as negative or alarming values. `hard_close_at` is computed once at Begin and persisted, never recomputed.
- **Savasana back:** `savasana_step_back` joins the event vocabulary; step movement in both directions persists before rendering.
- **Parser hardening:** input budgets enforced before parsing; the container splitter is specified as a total grammar with honest line attribution.
- The wake-message and schedule-scope blockers were product decisions — see the next entry.

## July 22, 2026 — Product resolutions ratified by Clare

Four room-visible questions from the review, each answered by Clare:

- Authored `wake_message` or fixed sentence at 7:58? **Authored text wins**, shown verbatim; validation warns above 90 characters. The screen treaty's example sentence is now just the canonical example.
- Non-Tuesday or non-19:00 class files? **Warn, don't block** — shifted weeks, subbing, and rehearsal files import with a visible warning and no scheduling UI.
- Drift display on a revisited segment? **Show `revisited`** in place of the number; the original drift stays in history and the export.
- After 8:00 PM? **Navigation stays open.** The hard close ends teaching, not the record; Clare finishes manually at the room's pace and nothing ever locks.

## July 22, 2026 — Review-driven test additions

Decision: acceptance tests C10 (schedule warning), E6 (durable fade-once), E7 (authored wake text), F8 (revisited display), F9 (serialized input) added; J2 now pins `fixtures/valid-boundary-content.md`, a valid 60-minute class carrying the 36/150/280-character copy boundaries on a single pose. M1 may begin.

## July 22, 2026 — Execution model: orchestrate with Fable, build with Opus

Question: should the orchestrating model also write the application code? **No.**

Decision: Claude Fable 5 handles orchestration, strategy, treaty stewardship, review, and verification; milestone build work is delegated to Claude Opus agents working from written work orders. Each work order scopes one milestone, cites the binding documents, forbids doc/fixture/archive edits, and requires ambiguities to be returned as Y/N/T questions rather than resolved silently in code. The orchestrator verifies (runs tests, reviews diffs) and commits; agents do not commit. Ratified by Clare (token economy: Fable tokens on judgment, Opus tokens on execution).

## July 22, 2026 — M1 complete (parse and validate)

Decision: M1 delivered by an Opus agent and verified by the orchestrator — 36 tests green plus independent orchestrator probes (expansion offsets match the treaty's D2 windows exactly; YAML anchors and aliases rejected). Four conservative agent readings ratified, none room-visible:

- The per-scalar input budget is enforced as an 8 KB physical-line cap before parsing (with the 512 KB file cap bounding block scalars) — an honest pre-parse proxy.
- Non-kebab-case `id`/`class_id` is a blocking error (the treaty states the rule without severity; strict is the safe reading).
- A non-Tuesday date and non-19:00 start produce one combined schedule warning.
- `hard_close_local` other than `"20:00"` is blocking, per the v1 rule.

Also noted: `npm audit` shows dev-only advisories (esbuild via vite 5/vitest 2); nothing ships in the bundle. Deferred — revisit at M6 when the build pipeline becomes release-bearing.

## July 22, 2026 — M2 complete (timing model)

Decision: M2 delivered by an Opus agent and verified by the orchestrator — 107 tests green plus independent probes (wake eligibility flips at exactly 7:58:00; hard close proven offset-dependent and therefore persisted at Begin; drift boundary and U+2212 display; revisited override; monotonic elapsed truth with cross-execution clamping). Conservative agent readings ratified:

- Clock-discontinuity tolerance is 2 seconds (both clocks advance together under tab throttling, so real jumps — DST, manual set, NTP steps — sit far above jitter).
- Drift of exactly 30 seconds displays `+1 min`/`−1 min` (the treaty's "below 30 seconds" bound is strict).
- The timing-status boundary is strict "exceeds": exactly 30s/15% reads on-plan.
- A segment never entered and not marked skipped derives `short` with 0 actual — the derivation never usurps Clare's explicit Skipped marking; Post-Class invites the correction.
- `run_started` carries the begin instant, run-local date, offset-at-Begin, and the persisted `hard_close_at`, making the event log self-sufficient for replay.

## July 22, 2026 — M3 complete (store and run machine)

Decision: M3 delivered by an Opus agent and verified by the orchestrator — 137 tests green plus an end-to-end probe (double-tap commits exactly one advance; a second Begin is blocked while a run is active; process-death recovery with a fresh execution identity lands on the exact segment and side with cues intact). Store: `idb` with strict durability on teaching-state transactions, transactional projections with rebuild-equivalence, immutable class revisions enforced by API shape, forward-only migration scaffold. Run machine: persist-before-acknowledge with a reject-while-pending single-flight guard (a double tap can never advance two segments).

The agent's three Y/N questions, resolved by the orchestrator against the treaties:

- Add a `run_completed` event to the vocabulary? **No.** `run_finished` is the durable teaching truth; completion is the administrative note-finalization transition on the run record. The event vocabulary is unchanged, so no instructions update is owed.
- Does the single-run guard block only `active_run`? **Yes.** A finished run with notes still pending must never block beginning next week's class — the room outranks the paperwork. The un-noted run stays completable from the Library.
- Does segment navigation collapse an open expanded reference? **Yes.** Every segment starts minimal; predictability on screen mirrors predictability in cueing (Principle 5).

## July 22, 2026 — M4a complete (live surfaces)

Decision: M4a delivered by an Opus agent and verified by the orchestrator — 175 tests green, 18.6 KB gzipped shell (budget: 150 KB), zero fixture content in the production bundle, and a hands-on browser walkthrough of Home → Prep → Begin → Grounding → Pose confirming the design system and the re-anchored windows live. The agent's Y/N questions, resolved:

- A visible Leave affordance on live screens? **No** — system Back opens the guard; the live surface stays sparse (Principle 2).
- Wall clock shows bare 12-hour time without meridiem? **Yes** — `7:24` matches `8:00 · hard close`; am/pm is noise in a 7–8 PM class.
- Upcoming-class chooser now? **No** — defers to M5 with the Library, per screen-states §3.

Defects and risks carried into M4b as required work:

- **Defect (found in orchestrator walkthrough):** the quiet wake-lock indicator overlaps the segment label on the Grounding screen — §14 forbids covering teaching content. Fix in M4b.
- **Risk (agent-flagged):** the wake-lock request currently happens after the IndexedDB write inside the Begin/Resume chain; some browsers only honor requests within the user-gesture task. M4b/Playwright must verify, and restructure to request synchronously in the gesture if needed.

Visual judgment calls (tap-zone chevrons, savasana dot markers, `m:ss / m:ss` actuals, authored dialog copy) accepted pending Claude Design frames and the studio rehearsal.

## July 22, 2026 — M4b complete (flow harness and the two fixes)

Decision: M4b delivered by an Opus agent and verified by the orchestrator — 185 Vitest + 17 Playwright specs green under independent runs, and a browser walkthrough confirming both fixes: the wake-lock indicator now occupies a reserved top band (overlap impossible by construction, geometry-asserted in real Chromium), and the wake-lock request fires synchronously inside the Begin/Resume gesture with post-persistence reconciliation (the agent mutation-tested its own spec by reverting the fix). Reload-recovery verified live: Run Recovery appeared after a half-hour-old abandoned session and resumed to the exact segment with truthful elapsed time.

Also established: a dev-only test-clock seam (`window.__settleInTestClock`), dynamic-imported behind `import.meta.env.DEV` and proven absent from the production bundle (byte-identical JS before/after). Playwright is marked regression/smoke only — G-series, A-series, H3, J-series, and B-series remain device-only per the CI-fidelity NO verdict, scripted in `docs/device-checklist.md`.

## July 22, 2026 — M5 complete (import, library, exports, backup/restore)

Decision: M5 delivered by an Opus agent and verified by the orchestrator — 228 Vitest + 18 Playwright green under independent runs, and a live UI walkthrough: the warning fixture pasted through the real import flow produced the exact C8 summary (40 minutes, 2 poses, 3 sides, 2 transitions, peak Sleeping Swan) with the C9 warning in warm contrast, non-blocking. The as-taught generator implements Export Schema v1 byte-deterministically with golden files covering clean, revisited, skipped, and substituted runs; restore validates the whole backup before any write and applies atomically. The export treaty was not modified.

The agent's Y/N questions, resolved:

- `APP_VERSION` starts at `0.1.0`? **Yes** — 1.0.0 belongs to the first taught Tuesday.
- Backup folds classes and original Markdown into a `revisions[]` shape? **Yes** — the treaty requires lossless payload, not a particular internal shape; the round-trip test is the proof.
- Merge treats preferences as put-if-absent? **Yes** — consistent with never-overwrite merge semantics.
- The upcoming-class chooser appears only when more than one future class exists? **Yes** — exactly screen-states §3.

Noted, no change: transition names retain their `Transition:` prefix in exports, faithful to M1 normalization and consistent with Prep's display. Bundle grew to 60.9 KB gzip (import ships the parser + yaml at runtime) — well under budget; an optional M6 code-split of the import path may restore a smaller teaching shell.

## July 22, 2026 — M6 complete (PWA shell); the build is code-complete

Decision: M6 delivered by an Opus agent and verified by the orchestrator — 232 Vitest + 18 flow + 3 PWA Playwright specs green under independent runs, both typecheck configs clean, and the precache audit verifying all 19 dist assets. The taper icon renders exactly to the locked identity (orchestrator-inspected at 512 and 48 px). Teaching shell code-split to 23.8 KB gzip with the parser as a 38.3 KB lazy chunk, both precached so offline import still works; fonts bundled locally (108 KB, latin subsets, OFL licenses preserved); self-only CSP; hand-written service worker with atomic install and §14 update surfaces; GitHub Actions deploy workflow gated on every test suite. Real-Chromium evidence now includes browser-process SIGKILL recovery to the exact segment.

Rulings:

- **A5 semantics (agent's Q1): Yes** — activation after process death is the treaty's MAY, not a MUST; the integration test asserts what A5 protects: deferral through the run (including close/reopen while active), version-crossing recovery to the exact segment, and safe out-of-run apply. Natural-activation remains an M7 on-device observation.
- **Update chip on the first-launch empty screen: accepted** — it is "outside a run" per §14's scope.
- **Audit bill: defer the breaking vite 8 migration.** The only remaining advisories are the dev-only esbuild dev-server chain; nothing ships in dist. Revisit as a deliberate, separately-tested migration after the first live-class pilot.

Remaining before the pilot: push + first deploy (blocked on GitHub account access), the M7 physical checklist (`docs/device-checklist.md`), the Yin Flow State project paste, and one real class authored through the workflow.

## July 22, 2026 — First deploy live

Decision: the repository is pushed to `clare-healy/settle-in` and the app is live at `https://clare-healy.github.io/settle-in/` (permanent origin). GitHub Pages was enabled by Clare with the "GitHub Actions" source; the first two deploy attempts failed at 0s because an unquoted colon in a workflow step name (`production build: offline…`) made GitHub reject the YAML — a validation the local test gates do not cover. Quoting the name fixed it; the full CI gate (Vitest, both typechecks, build + precache audit, flow harness, PWA suite) then passed and published. Root, manifest, service worker, and icon verified serving 200.

Noted, not blocking: the GitHub-hosted runner warns that Node 20 is deprecated and forces the `actions/*` steps onto Node 24. Bump `actions/checkout`, `actions/setup-node`, `actions/cache`, and `actions/upload-pages-artifact` to their Node-24 majors when convenient; no effect on the deployed app. Every push to `main` now runs the full gate and redeploys, so documentation-only commits also spend a CI run.
