# Pass to Codex — independent review of PR #1, and a fix to review

Status: written October 28, 2026, by Claude Code after an independent review of PR #1. Clare asked Claude to fix the one P1 finding and pass the rest back.
Receiver: Codex with the `settle-in` repository mounted. `AGENTS.md` binds you as before.
Branches:
- `codex/field-learning-iteration` — yours, unchanged by Claude, still at `d0f112b`;
- `claude/fix-schedule-revert` — the fix, opened as [PR #2](https://github.com/clare-healy/settle-in/pull/2) into your branch.

## Why this pass exists

`docs/pass-to-claude-code-pr-review.md` asked for an independent review of PR #1. The full review is posted as a [comment on PR #1](https://github.com/clare-healy/settle-in/pull/1#issuecomment-6474786129). Its verdict was **REQUEST CHANGES** for one P1, plus three P3s.

Clare then asked Claude to fix the P1. Usually the author makes fixes, and a reviewer who writes a fix shouldn't also review it. So the fix sits on its own branch and PR, and you review it before it joins your branch. Everything else from the review comes back to you here.

## 1. Where things stand

| Item | State on October 28 |
|---|---|
| PR #1 (`codex/field-learning-iteration` → `main`) | Open, draft. Review posted as a comment (not a formal review, so GitHub shows no "changes requested" status). CI green on `d0f112b`. |
| PR #2 (`claude/fix-schedule-revert` → `codex/field-learning-iteration`) | Open, awaiting your review. Two commits: the fix and this pass. |
| CI on PR #2 | None. `deploy.yml` runs on pull requests into `main` only. Evidence is local (below). CI will run on PR #1 once PR #2 is merged into its branch. |
| Clare's local checkout | Returned to `codex/field-learning-iteration`, clean. The fix exists only on `claude/fix-schedule-revert`. |

## 2. Review PR #2

**The defect:** changing a scheduled time and then changing it back (7:00 → 6:30 → 7:00) resolves to the original revision.
- That revision is already stored, and `putClassRevision` is put-if-absent, so it is never re-saved.
- The mistaken 6:30 revision therefore stayed the most recently imported.
- `upcomingDefinition` returned "latest," so after a relaunch or a Home → Prep round trip, Prep showed 6:30–7:30, and Begin Class persisted a 7:30 hard close.

**The fix:**
- The revision Clare last chose is recorded per class as a local preference (`pref.currentRevision.<class_id>`). Both `changeSchedule` and `importConfirm` write it.
- `groupClasses` takes the choices and exposes `current` in place of `latest`: the chosen revision when it still exists, otherwise the most recently imported.
- `latestRevision()` is unchanged.
- Files touched:
  - `src/ui/preferences.ts`
  - `src/ui/library-model.ts`
  - `src/ui/app.ts`
  - `src/ui/screens/class-detail.ts`
  - `src/ui/screens/library.ts`
  - tests
  - `docs/implementation-treaty.md` (§ Schedule correction)
  - `docs/acceptance-tests.md` (C12)
  - `docs/decision-log.md` (new October 28 entry)

**Please check these choices in particular:**

1. **Relaxed durability.** The preference is written with relaxed durability, after the strict revision write. The treaty allows relaxed writes for preferences. If the process dies between the two writes, the new revision is still the latest import in every case except a revert, so the exposure is a revert followed by an immediate crash. Decide whether that is acceptable or whether this one preference deserves a strict write.
2. **Re-importing an identical source doesn't change the choice.** That path still opens the existing class without recording it as chosen. Claude kept the fix narrow. If you think a re-import is a deliberate choice, frame it for Clare as a yes/no question.
3. **Restore.** A merge restore keeps local preferences (put-if-absent), so a local choice survives. A choice that points to a revision that is gone falls back to the latest import. A replacement restore brings the backup's choices with it.
4. **The rename.** `latest` → `current` touches three screen call sites. No other code referred to the field.

**Tests in the PR:**
- **Regression:** a UI test for the 7:00 → 6:30 → 7:00 relaunch case. It failed before the fix (`Scheduled class · 6:30–7:30`) and passes now.
- **Unit:** two tests for the choice and its fallback.
- **Import:** the C6 test now asserts that a new import becomes the current revision.

**Local verification on the fixed tree:**
- typecheck passed;
- 277/277 unit tests;
- build passed;
- `test:e2e` 24 passed;
- `test:e2e:strict` 20 passed;
- `git diff --check` clean;
- `test:e2e:pwa` 2 passed and 1 failed; the failed test passed when rerun on its own (see section 4).

Merge PR #2 into your branch only with Clare's go-ahead. If you want changes, request them on PR #2.

## 3. Remaining review findings (P3, yours to fix or rule out)

1. **The CI queue is shared** (`.github/workflows/deploy.yml:27-28`).
   - `concurrency: group: pages` now covers pull-request runs too, and GitHub keeps one waiting run per group.
   - A later PR run can cancel a waiting `main` deploy, so a merge could fail to deploy without notice.
   - Fix: move `concurrency` onto the `deploy` job, or name the group by branch.
   - Also, `if: github.event_name != 'pull_request'` lets a manual run on any branch through. Only the `github-pages` environment's branch policy (main only, confirmed) stops it. Adding `&& github.ref == 'refs/heads/main'` makes the workflow enforce the same rule.
2. **An early tap can pick the wrong day for a class starting just after midnight** (`src/model/time.ts:55`).
   - The nearest-occurrence logic runs only for hours that cross midnight. A 00:15–01:15 class tapped at 23:58 got a hard close about 22.7 hours in the past.
   - Unlikely for Clare's teaching. Either apply the nearest-occurrence rule to every schedule or note the limit in the treaty.
3. **Wording and protected history.**
   - `docs/implementation-treaty.md:98` says "contract" in a binding treaty; `CLAUDE.md` requires "treaty."
   - `src/schema/run.ts:85` cites "§ Re-anchored plan," which no longer exists.
   - `COGNITIVE-LINEAGE.md:48` edits an existing line instead of appending, which `AGENTS.md` asks you not to do. The edit is accurate, so either restore the line and append the correction, or ask Clare to accept it.

## 4. A flaky PWA test (existed before PR #1)

`e2e-pwa/update-deferral.spec.ts` closes the whole browser mid-run, reopens it, and asserts at line 99 that the waiting worker has **not** activated. The test's own comment and the treaty both say a waiting worker MAY activate after process death. So the assertion is stricter than the rule it tests, and it failed once during this review.

In the failing run:
- Chrome activated the worker on its own;
- recovery to the exact segment across the version boundary had already passed;
- the update pill correctly stayed hidden.

The file has not changed since M6. Consider asserting only what A5 protects at that step: recovery, no pill, and no forced reload. Activation is allowed to go either way.

## 5. Questions for Clare (frame and record as yes/no)

1. **A dictated reflection that she then skipped.** Skip keeps the draft, so the reflection corpus exports it labelled "saved draft," while that run's as-taught export says `None recorded.` This matches the treaty's wording ("any non-empty saved draft"). Should a skipped dictation appear in the corpus?
2. **A run in progress across the upgrade.** A run begun on 0.1.0 (re-anchored windows) and recovered on 0.2.0 after process death switches to scheduled-hour windows mid-class. Claude assumed this is acceptable because it is so unlikely. Confirm or rule otherwise.
3. **Branch protection.** `main` has no branch protection, so green PR checks don't block a merge. Should passing checks be required before merging to `main`? Clare changes this in GitHub settings.

## 6. Unchanged

- The independent review found the rest of PR #1 sound:
  - the bilateral midpoint extension is backward compatible and needs no migration;
  - the dry-run fixture differs from Claude's original download in exactly the two midpoint fields, with the cue text verbatim and Side 1/Side 2 mapped to right/left;
  - the fixture's arithmetic sums to 60 minutes, Savasana runs 7:15–7:30, and the wake message is eligible from 7:28;
  - pull-request runs do not deploy.
- The human gates in `docs/pass-to-claude-code-pr-review.md` are still open: external Claude project sync, Pixel 6 import and rehearsal, installed-PWA update, airplane-mode run, dim-room glance test, and real reflection-corpus export.
- PR #1 stays a draft. Clare alone decides when it is ready and when it merges.
- `COGNITIVE-LINEAGE.md` has not been appended for this review. Whether it counts as a substantial contribution is Clare's call.

## Files changed by Claude

On `claude/fix-schedule-revert` only:

- the fix, its tests, and the treaty, acceptance, and decision-log updates listed in section 2;
- `docs/pass-to-codex-review-fixes.md` — this pass.
