# Pass to Claude Code — independent review of Settle In PR #1

Status: ready for independent review after the October 28 dry-run fixture is committed and pushed.
Repository: `/Users/clare/Documents/vibe-projects/settle-in`
Pull request: `https://github.com/clare-healy/settle-in/pull/1`
Base: `main`
Head: `codex/field-learning-iteration`

## Your role

Act as an independent reviewer, not an implementer. Review the pull request for correctness, regressions, treaty compliance, migration safety, and evidence quality. Do not merge, mark ready, deploy, post to GitHub, commit, amend, rebase, or change application/docs/tests unless Clare separately asks after reading your findings.

Clare is learning software development through this process. Make the review legible to a non-software engineer without diluting the technical standard. Explain why each material finding matters in the room, in stored history, or in the release process.

## Establish the review target before reading code

1. Run `git status --short --branch`.
2. If the worktree is dirty, stop and report the exact paths; do not discard or absorb them.
3. Run `git fetch origin`.
4. Record the exact SHAs for `origin/main` and `origin/codex/field-learning-iteration`.
5. Confirm PR #1 still targets `main`, remains unmerged, and points at the head SHA you recorded.
6. Review `origin/main...origin/codex/field-learning-iteration`, not an assumed commit count or a stale local branch.

If network or GitHub access is unavailable, continue with the locally available refs but label the target **unverified-current**.

## Required reading order

Read these files completely before forming findings, following the authority order in `README.md`:

1. `README.md`
2. `docs/product-spec.md`
3. `docs/implementation-treaty.md`
4. `docs/class-format.md`
5. `docs/screen-states.md`
6. `docs/design-system.md`
7. `docs/acceptance-tests.md`
8. `docs/decision-log.md`
9. `docs/settle-in-authoring-instructions.md`
10. `COGNITIVE-LINEAGE.md`
11. `docs/pass-to-settle-in-authoring-project.md`
12. `docs/pass-to-codex-authoring-sync.md`

Treat `archive/original-concept/` as protected provenance. Do not edit it.

## Review the whole change, with special attention to these risks

### 1. Scheduled-hour timing and correction

- Any exact one-hour local schedule works, including `:30` and cross-midnight starts.
- Begin Class never re-anchors planned windows or the hard close.
- The nearest scheduled occurrence is chosen correctly around midnight and for rehearsals.
- The one-screen correction recalculates the close live, has one `Change Schedule` action, and creates a new immutable revision before acknowledgement.
- Original source, prior revisions, and runs remain untouched.

### 2. Segment structure and live behavior

- One optional opening Transition may follow Grounding and leads to the first pose.
- Grounding timing remains informational; there is no automatic advancement.
- Savasana shows all six cues together and writes no new cue-step events, while historic events remain readable.
- The wake message remains Savasana-only and hard-close anchored.

### 3. Bilateral midpoint Schema v1 extension

- Existing single-string midpoint files retain identical meaning and storage compatibility.
- A bilateral midpoint map requires exactly nonempty `right` and `left` keys.
- A map is rejected on non-bilateral poses.
- `side_order` cannot put a cue on the wrong side.
- Each side receives its own 150-character glance warning and live cue.
- No unsupported cue fields were generalized beyond Clare's ruling.
- No database or as-taught export migration is silently owed.

Use `fixtures/tending-dry-run-2026-10-28.md` as the field-authored proof case. Confirm its arithmetic, opening transition, planned windows, side-specific cues, and Savasana window independently rather than relying only on its test expectations.

### 4. Honest history, exports, and recovery

- Reflection-corpus export includes every nonempty final reflection and saved draft, preserves text verbatim, orders chronologically, and does not masquerade as a restore format.
- As-taught/export status derivation remains backward compatible.
- Backup/restore and stored class/run shapes remain compatible.
- Service-worker updates never interrupt an active run and recovery crosses app versions safely.

### 5. Integrated authoring system

- Any class-format change is reflected in `docs/settle-in-authoring-instructions.md`, fixtures, acceptance tests, and parser/runtime behavior.
- The governed dry-run fixture does not silently rewrite Clare's teaching content; only the two interim combined midpoint strings should be structurally separated.
- The repository correctly continues to say the external Claude project is awaiting manual sync until Clare confirms the paste and knowledge-file replacement.

### 6. CI and release discipline

- Pull requests run the full verification job.
- The PR event cannot deploy GitHub Pages.
- Only a successful push to `main` can run the deploy job.
- A green automated job is not represented as proof of Pixel, installed-PWA, airplane-mode, studio-glanceability, real-corpus, or external-Claude-project gates.

## Verification to run

Run these from a clean worktree and report exit status plus the behavior each result demonstrates:

```text
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:e2e:pwa
npm run test:e2e:strict
git diff --check origin/main...origin/codex/field-learning-iteration
```

If a browser process crashes without an assertion failure, rerun the exact failing test once in isolation and report both events. Do not convert an infrastructure crash into a product pass without the clean rerun.

Also inspect the live GitHub Actions result for the reviewed head SHA. Local success and GitHub success are separate evidence.

## Required review output

Return one Markdown review in the Claude Code conversation. Do not post it to GitHub without Clare's action-time approval.

Use this order:

1. **Findings**, highest severity first (`P0`–`P3`), each with a tight file and line reference, the failing scenario, user/product consequence, and the smallest appropriate remedy.
2. **Questions or assumptions** that genuinely affect the verdict.
3. **Verification evidence**, as a table: command or inspection, observed result, what it proves, and what it does not prove.
4. **Human gates still open**, explicitly separated from software findings.
5. **Verdict**: `REQUEST CHANGES`, `CODE-REVIEW APPROVE — HUMAN GATES OPEN`, or `BLOCKED — REVIEW TARGET UNVERIFIED`.

If there are no actionable findings, say so explicitly. Do not manufacture style comments to make the review look substantial. Conversely, do not let green tests excuse a treaty conflict, missing migration, misleading verification claim, or room-visible regression.

## Human gates that are not yours to close

- Clare pastes the canonical instructions into the external Claude project and replaces its governed knowledge files.
- The dry-run class is imported and rehearsed on the physical Pixel 6.
- Installed-PWA update behavior is observed on the phone.
- Airplane-mode cold launch and complete run are observed.
- Savasana and per-side midpoint cues pass the dim-room glance test.
- Clare exports and inspects her real reflection corpus.
- Clare alone decides when to mark the PR ready and when to merge.
