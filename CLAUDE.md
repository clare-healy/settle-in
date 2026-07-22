# Settle In — Claude Code Orientation

This repository is a standalone app build. The empire vault's WEAVE governance, routing grammar, and vault conventions do **not** apply inside this directory; this file overrides the parent vault CLAUDE.md for work here.

## Orientation

1. Read `README.md` first, then follow the required reading order in `AGENTS.md` before proposing architecture or writing code.
2. Resolve document conflicts using the authority order in `README.md`. Ends and principles in `docs/product-spec.md` outrank everything, including technical convenience.
3. Binding technical documents use the **treaty** convention (principles-based computing), not "contract".

## Operating primitive

Decisions run on **yes/no/triangulate**:

- Missing decisions are framed as yes/no questions for Clare.
- What cannot be framed cleanly is held as a triangulate node and triangulated against the ends, means, and principles until it resolves.
- Outcomes land in `docs/decision-log.md`; open triangulate nodes are listed at its top.

## Hard rules (see AGENTS.md for the full set)

- Never add audio, vibration, haptics, notifications, analytics, accounts, cloud dependencies, or automatic teaching advancement.
- The app and the Claude project "Yin Flow State" are one integrated system: schema changes update `docs/yin-flow-state-instructions.md` in the same change.
- Never edit `archive/original-concept/` (checksummed provenance) and never remove `COGNITIVE-LINEAGE.md` — append to it.
