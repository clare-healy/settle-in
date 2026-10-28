# Pass to Codex — authoring-project sync review and a per-side midpoint request

Status: written October 28, 2026, after a sync review of the Claude "Settle In" authoring project.
Receiver: Codex with the `settle-in` repository mounted. `AGENTS.md` binds you as before.
Branch: `codex/field-learning-iteration` (working tree changes below are uncommitted).

## Receiver disposition — October 28, 2026

Codex accepted the pass without overwriting Claude's documentation changes. The per-side midpoint request is implemented as an additive Schema v1 form: an existing midpoint sentence remains valid and shared, while a bilateral pose may supply an explicit `right`/`left` mapping. No class-schema bump, database migration, or as-taught export change is needed because existing classes retain their meaning and exports do not carry cue copy. Grounding language now states explicitly that Clare advances manually at its planned close; the app never advances teaching automatically. The repository inconsistencies in section 6 are corrected except for the proposed second governed example, which should come from Clare's real 6:30–7:30 dry run rather than invented content.

## Why this pass exists

The October 20 field-learning iteration prepared `docs/pass-to-settle-in-authoring-project.md` so the Claude authoring project could be brought in line with the app. On October 28 a Claude session with this repository mounted followed that pass: it read the canonical instructions and the current class-format treaty, compared them with what is live in the Claude project, and listed every conflict for Clare instead of resolving them. Clare ruled on each one.

This pass tells you what changed, what the authoring side now knows, one schema request, one open question, and some small inconsistencies found in the repository along the way.

## 1. Where the authoring-project deployment stands

| Pass step | State on October 28 |
|---|---|
| 1. Rename the Claude project to Settle In | Done. The project already carries the name. |
| 2–3. Replace the project instructions with the canonical block | Not done. The live instructions were still headed "Yin Flow State" and carried July rules (Tuesday 7:00–8:00 only, re-anchoring on Begin Class, wake message "at 7:58"). They also carried rules Clare added in the project after July; see section 2. |
| 4. Replace the governed knowledge files | `class-format.md` in the project is the July 22 version and is stale. `fixtures/valid-desire-paths.md` has not changed since July 22, so replacing it is a no-op. |
| 6. Dry-run class, 6:30–7:30 with an opening transition | Not done. |
| 7. Record the sync in the decision log | Not done. The October 28 decision-log entry records the review and rulings, not a completed sync. |

The integrated system remains **awaiting external sync**. The Claude project instructions can only be replaced by Clare pasting them; the Claude session cannot edit them.

## 2. Clare's rulings and what changed in the canonical instructions

All of these are recorded in `docs/decision-log.md` under October 28, 2026. Only `docs/settle-in-authoring-instructions.md` changed. No schema, fixture, code, or test changed.

**A. Rules Clare added to the live project are now canonical.** Pasting the October 20 block would have deleted three things she added in the project after July. They are now in the canonical file:

- **TCM Sources and Meridian Visuals** (new subsection under Themes & Energetic Frameworks): source order, exclusions, claim labels, WHO 2008 figures first, no meridians drawn by Claude, pose mechanics confirmed from the Reinhardt manual or Clare's own teaching. These govern design research only. They do not touch the class file or the app.
- **Mind-wandering cue** (Key Learnings): one midpoint early in class invites students back to the breath or the physical sensations.
- **Bilateral midpoints** (Key Learnings, plus notes in the cueing architecture and guide format). See the schema request in section 4.

**B. Bethany's Monday deliverables are removed.** Clare stopped them on October 12: she asks Bethany for feedback directly, usually in person, and class promotion has its own process. The canonical file no longer has Phase 3 step 10 or the Phase 4 Bethany Review; After Class is now Phase 4, step 10. The "review via text on Mondays" lines are replaced with "gives feedback when Clare asks, usually in person." The live project had already dropped these phases, which is why its numbering jumped from step 9 to step 12.

**C. Child's pose.** It may now be a grounding hold, a counterpose, or its own long hold mid-sequence where it fits the theme and the flow. Still not a default filler. Updated in Sequencing Logic and Key Learnings.

**D. Grounding absorbs the late start.** Clare confirmed this works the same way under scheduled-hour anchoring as it did under re-anchoring. Grounding ends at the close of its planned window; every later segment keeps its scheduled window. Example: a 7:00–7:11 Grounding begun at 7:03 runs 8 minutes, and the next segment begins at 7:11. Added to Class Structure & Timing and Key Learnings.

## 3. What the authoring side now knows about flows and functions

These are the October 20 changes as the authoring project will now apply them, plus how they meet Clare's rulings. They are listed so you can check that the app and the authoring side read the treaties the same way.

1. Any local start; hard close exactly one hour later, including across midnight; no warning for a non-Tuesday or non-19:00 class.
2. Begin Class never moves planned windows. Late start shows as `+N min` drift.
3. Grounding absorbs that late start (ruling D). **Checked against the code:** the Grounding screen's `timingBlock` in `src/ui/screens/live.ts` already shows the planned window and elapsed time, so Clare can see when Grounding's window closes. No app change is needed.
4. A schedule corrected in Prep becomes a new immutable revision, and that corrected Markdown is the source for later drafts.
5. One optional opening Transition may follow Grounding, for whole-body wake-up and directional preview, leading to the first pose. The authoring instructions still say "1 min transitions"; the schema accepts any whole number, so a longer opening transition is a design choice for Clare, not a validation problem.
6. The six Savasana cues display together as reminders.
7. The wake message appears only on the Savasana screen, from two minutes before hard close.
8. Export statuses are derived automatically; `substituted` and `substituted_with` appear only in historic runs. The Room note carries more weight than timing rows.
9. **New reading rule from ruling D:** after a late start, the export will usually show Grounding as `short` (an 8-minute actual against an 11-minute plan exceeds the greater of 30 seconds and 15%). The authoring instructions now tell the assistant to compare `run_started_at` with the scheduled start (one hour before `hard_close_at`) before reading a short Grounding as a reason to plan less Grounding time.

## 4. Schema request — distinct midpoint cues per side (Clare: yes)

**What Clare said.** Bilateral poses already appear as two cards in the room (last night: Sleeping Swan on the right, then Sleeping Swan on the left). Each side is "a different experience of the pose," and the midpoint cue should differ side by side. Today both cards show the same `midpoint` text, written as "Side 1: … Side 2: …". She wants the right card to show only the right-side midpoint and the left card to show only the left-side midpoint.

**What the code does today.** `midpoint` is one required string on the authored pose (`POSE_CUE_FIELDS` in `src/parser/validate.ts`; `midpoint: string` in `src/schema/index.ts`). Both expanded side segments receive the same `cues` object, and `midpointNode` in `src/ui/screens/live.ts` renders it on each side card. `docs/class-format.md` states "Pose cue copy is shared across sides."

**Constraints the authoring side needs from the change.**

- Existing class files with a single `midpoint` stay valid and display as they do now.
- Each side's midpoint has the same glance limit as today (warning above 150 characters).
- The authored side order (`side_order`) determines which cue belongs to which card. A cue must never appear on the wrong side.
- `docs/class-format.md`, the fixtures, the acceptance tests, and `docs/settle-in-authoring-instructions.md` change together, per `AGENTS.md`. The canonical instructions currently say: until the per-side field ships, write both cues in the one field as "Side 1: … Side 2: …" and never invent a field. Replace that interim sentence in the same change.

**Left for you to frame as yes/no questions for Clare.** The field shape, whether this needs a `schema_version` bump, and how the as-taught export represents it. Clare scoped her request to the midpoint cue. If you think the other cue fields (entry, settling, exit) should vary by side, ask her; do not extend it on her behalf.

## 5. Open question — should the export show that Grounding absorbed a late start?

Nothing is broken. The as-taught front matter has `run_started_at` and `hard_close_at` but not the scheduled start, so the authoring side has to calculate it (one hour before close) to tell a late-start `short` Grounding from a genuinely short one. Options you might weigh: leave it as is (the instructions now explain how to read it), add the scheduled start to the export front matter, or treat late-start absorption in Grounding's status. Any change to the export schema follows the same same-change rule. Clare has not ruled on this.

## 6. Small problems found in the repository

None of these were changed. Each is yours to fix or rule out.

1. `docs/pass-to-settle-in-authoring-project.md` has a section headed "Contract changes the authoring project must understand." `CLAUDE.md` and the July 21 treaty-naming decision require "treaty."
2. The `README.md` repository map lists `docs/yin-flow-state-instructions.md`, which no longer exists. The canonical file is `docs/settle-in-authoring-instructions.md`. The map also omits `docs/settle-in-authoring-instructions.md` and the pass documents.
3. `docs/class-format.md`, as-taught rules: one bullet says "`substituted_with` is retained in the schema for honest history and for runs recorded before manual correction was retired; nothing in the current app sets it." The next bullet still says "`substituted_with` carries the short replacement name Clare entered, otherwise `null`." The second should say this applies to historic runs.
4. `fixtures/valid-desire-paths.md` is the authoring project's known-good example, but it still models only a Tuesday 19:00–20:00 class with no opening transition, so the authoring side has no valid example of either new feature. Its Savasana cues ("Settle," "Body scan," "Breath softens," and so on) also differ from Clare's six-part Savasana structure in the authoring instructions. Consider a second governed example (for instance the 6:30–7:30 dry run once it validates) rather than changing the first fixture.
5. Earlier decision-log entries still describe re-anchoring without a note that the October 20 entry supersedes them: "July 21, 2026 — Hard class close" ("runs behind the re-anchored plan"; wake message "tied to 7:58 PM") and "July 21, 2026 — Run begun after hard close" ("re-anchored planned windows still follow the actual start time"). The log is history, so this may be fine; a one-line "superseded October 20" note would stop a reader from taking them as current.

## 7. What Clare still has to do outside the repository

1. Paste everything between the markers in `docs/settle-in-authoring-instructions.md` into the Claude project's instructions.
2. Replace `class-format.md` in the project with the current repository version.
3. Ask the project for the 6:30–7:30 dry-run class with an opening transition and validate it in Settle In.
4. Record the sync in `docs/decision-log.md`.

If you ship the per-side midpoint change first, Clare should paste the instructions and replace `class-format.md` after that change, so she deploys once.

## Files changed in this session

- `docs/settle-in-authoring-instructions.md` — rulings A–D
- `docs/decision-log.md` — October 28, 2026 entry
- `docs/pass-to-codex-authoring-sync.md` — this pass

Nothing was committed.
