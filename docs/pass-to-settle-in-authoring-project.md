# Pass to the Claude Settle In Authoring Project

Status: **pass prepared; external deployment not yet completed**

Prepared: October 20, 2026

Repository branch: `codex/field-learning-iteration`

## Why this pass exists

The phone app and the Claude authoring project are one product. This field-learning iteration changes assumptions the authoring project uses when it creates class files, and Clare is renaming the Claude project from **Yin Flow State** to **Settle In**. Repository changes do not prove that the external Claude project has been renamed or updated.

Do not mark the integrated-system handoff complete until Clare performs the manual deployment steps below and records the result.

## Treaty changes the authoring project must understand

1. A class is exactly one scheduled hour but may start at any local minute, including `:30`; `hard_close_local` is always exactly 60 minutes later.
2. Begin Class never re-anchors the plan. A class scheduled 6:30–7:30 and begun at 6:33 retains its 6:30 windows, shows `+3 min`, and closes at 7:30.
3. If Prep reveals an incorrect authored time, Clare may change the scheduled start on one screen. Settle In calculates the close and saves a new immutable revision. Corrected Markdown must flow back to the authoring project so a later draft does not restore the old time.
4. One optional Transition may appear directly after Grounding. Use it for whole-body waking, directional preparation, and previewing the tissues and movement patterns that will matter later.
5. The six Savasana cues display together as a reminder list. They are not a checklist and are not advanced one at a time.
6. Settle In can export the complete reflection corpus as human-readable Markdown. That corpus is evidence for app-development learning; it does not authorize the authoring project to turn teaching history into a scorecard.
7. Class input, as-taught export, backup, and database schema version numbers remain unchanged. Existing class files and taught runs remain valid.
8. (October 28) A bilateral pose's `midpoint` may be a mapping with exactly one `right` cue and one `left` cue, and new bilateral poses use it so each side card shows only its own cue. A single shared sentence remains valid for older files.

## Prerequisite: the app must be deployed first

On October 28 the app installed on Clare's phone was still the July build (`0.1.0`, from `main` at `4d490fb`). That build rejects every class file written to the new instructions: a hard close other than `20:00`, a transition directly after Grounding, and a `right`/`left` midpoint mapping are all blocking errors there, and even the updated `valid-desire-paths.md` fails to import. The new instructions may be pasted into the Claude project at any time, but no class authored from them can be imported until PR #1 is merged to `main`, the deploy succeeds, and the phone has taken the `0.2.0` update. The dry run in step 6 needs the same.

## Manual deployment steps for Clare

1. Rename the Claude project to **Settle In**.
2. Open [`docs/settle-in-authoring-instructions.md`](settle-in-authoring-instructions.md).
3. Replace the Claude project's instructions with everything between `BEGIN PROJECT INSTRUCTIONS` and `END PROJECT INSTRUCTIONS`.
4. Replace the project's governed knowledge copies with the current repository versions of:
   - [`docs/class-format.md`](class-format.md)
   - [`fixtures/valid-desire-paths.md`](../fixtures/valid-desire-paths.md)
   - and add [`fixtures/tending-dry-run-2026-10-28.md`](../fixtures/tending-dry-run-2026-10-28.md), the field-authored example
5. Keep Clare's existing teacher-training, accessibility, principles, and research knowledge in place; this pass does not replace it.
6. After the phone has the `0.2.0` update, import the dry-run class (`fixtures/tending-dry-run-2026-10-28.md`, scheduled 6:30–7:30 with an opening movement transition and per-side midpoint cues) and validate it in Settle In. Do not use that dry run as a live class unless Clare chooses to.
7. Record the date and result of the sync in `docs/decision-log.md`.

## Handoff message to paste into the Claude project

> This project is now named Settle In, matching the phone app it authors for. I have replaced your project instructions and governed schema knowledge from the Settle In repository. Read the updated instructions and class format as authoritative. Pay particular attention to arbitrary one-hour scheduled windows, fixed scheduled-hour anchoring after a late Begin, the optional opening movement transition after Grounding, static Savasana cue reminders, distinct `right`/`left` midpoint cues for bilateral poses, delivery of class files as downloadable `.md` files, and the rule that an in-app schedule correction creates a new immutable revision that must flow back into this project. Before writing a live class, tell me which old assumptions changed and identify any conflict you find in the attached materials. Do not silently resolve a conflict.

## Completion evidence

The handoff is complete only when all four statements are true:

- the Claude project visibly carries the name **Settle In**;
- the deployed project instructions match the canonical marked block;
- the two governed knowledge files have been replaced;
- the dry-run class validates with a 6:30 start, 7:30 close, and opening transition in the expected position.

Until then, the repository side is prepared but the integrated system remains **awaiting external sync**.
