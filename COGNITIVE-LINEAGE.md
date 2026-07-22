# Cognitive Lineage

This document records how the Yin Class Companion concept and build context were formed. It is attribution, not a claim that any AI system owns product authority.

## Clare

Clare is the product originator, intended user, teaching-domain authority, and final decision-maker.

The app's ends, room behavior, timing philosophy, silence requirement, authoring workflow, functional-yoga content, and definition of a successful live class come from Clare's practice and judgment. Field observations from actual classes supersede speculative design assumptions.

## Claude and Claude Design

Claude and Claude Design supported the first articulation of the concept, including:

- The initial app specification and its Ends / Means / Principles framing
- The studio-derived visual brief
- The first screen mock-ups
- The initial structured-Markdown class-file direction
- Iteration from App Spec v2 to v3

Those original artifacts are preserved unchanged in `archive/original-concept/`.

## OpenAI GPT-5.6 / Codex

GPT-5.6 operating through Codex contributed a substantial triangulation and build-readiness pass on July 21, 2026. Its contribution included:

- Reviewing the product specification, design brief, and interactive mock-up together
- Distinguishing product vision from implementation treaty
- Identifying contradictions in offline delivery, wake-lock behavior, timing, overflow, and the savasana signal
- Recommending the versioned class treaty and normalized internal data model
- Defining the separation between an immutable class plan and timestamped taught runs
- Formalizing the timing, recovery, persistence, screen-state, and acceptance-test context needed for implementation
- Reorganizing the context into the present canonical documentation package

Codex's technical recommendations are subordinate to Clare's ends and principles. Where platform constraints require a different means—such as a small multi-file PWA rather than a literal single HTML file—the chosen means must preserve the intended room experience.

## OpenAI GPT-5.6 — July 22, 2026 (Phase 1 adversarial review)

GPT-5.6, with the repository mounted, performed the Phase 1 adversarial review (`docs/phase-1-adversarial-review.md`): verdicts on the four open architecture nodes (YES on the `yaml` library, `idb`, and no-framework; NO on CI offline emulation as acceptance evidence), seven blockers (service-worker activation after client death, IndexedDB durability, clock discontinuities, the missing savasana back event, wake-message authority, schedule-schema scope, YAML AST policy), and a body of material findings on projections, drift semantics, parser budgets, restore atomicity, and test-gate honesty. It also flagged GPS metadata in the reference photographs before publication. All verdicts and blockers were resolved into the treaties and decision log by Claude with Clare's ratification of the four room-visible questions.

## Claude Fable 5 (Claude Code) — July 21, 2026

Claude Fable 5, operating through Claude Code, performed the final build-readiness pass with Clare. Its contribution included:

- Verifying internal consistency of the canonical package, fixture arithmetic, and archive checksums
- Renaming the contract convention to the treaty convention across the package (principles-based computing)
- Defining the as-taught export schema (Export Schema v1) in `docs/class-format.md`, closing the loop behind the end "each taught class strengthens future class construction"
- Establishing the integrated-system rule between the app and the Claude "Yin Flow State" authoring project, and authoring `docs/yin-flow-state-instructions.md`
- Adopting the yes/no/triangulate decision primitive for the decision log and missing-decision handling
- Defining post-hard-close run behavior, restore merge semantics, and the warn-without-blocking fixture path (`fixtures/warning-short-plan.md`, acceptance test C9)
- Reframing wireframes as refinements rather than build gates
- Organizing and descriptively naming the delivered studio reference photographs

Product assumptions introduced: as-taught timing-status thresholds (greater of 30 seconds and 15% of planned) as v1 defaults tunable under the field-learning rule. All decisions were ratified by Clare and recorded in `docs/decision-log.md`.

## Continuing lineage

Future material contributions should be appended with:

- Date
- Person or system
- Artifacts or decisions affected
- Nature of the contribution
- Any product assumptions introduced

Generated code should preserve this file. A concise attribution may appear in repository documentation or an About screen, but attribution must never add friction to the in-class interface.
