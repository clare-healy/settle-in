# Decision Log

This log records material product and implementation decisions. Canonical behavior lives in the subject-specific documents; this file preserves decision context.

The log operates on the yes/no/triangulate primitive. Each entry records a question that was resolved **yes** or **no**, or is held open as **triangulate**. Open triangulate nodes are triangulated against the ends, means, and principles in `docs/product-spec.md` until they resolve; unresolved nodes are listed at the top of the log so they cannot silently disappear.

## Open triangulate nodes

- **Build-plan architecture review** (opened July 22, 2026): `docs/build-plan.md` is proposed and awaiting the GPT-5.6/Codex adversarial pass. Its four internal nodes (YAML library, idb wrapper, no-framework, offline-test fidelity) resolve to Y/N here before milestone M1 begins.

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
