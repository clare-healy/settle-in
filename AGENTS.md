# Build Instructions for Agents

This repository is currently a build-context package for Settle In.

## Required reading order

Before proposing architecture or writing application code, read these files completely:

1. `README.md`
2. `docs/product-spec.md`
3. `docs/implementation-treaty.md`
4. `docs/class-format.md`
5. `docs/screen-states.md`
6. `docs/design-system.md`
7. `docs/acceptance-tests.md`
8. `docs/decision-log.md`
9. `docs/yin-flow-state-instructions.md`
10. `COGNITIVE-LINEAGE.md`

Use the authority order in `README.md` when resolving apparent conflicts.

## Product guardrails

- Preserve the Ends / Means / Principles. Technical convenience does not outrank them.
- Never add audio, vibration, haptics, notifications, analytics, tracking, accounts, cloud dependencies, or automatic teaching advancement.
- Treat 8:00 PM as a hard close and bilateral duration as per side.
- Keep authored class definitions immutable and store every taught run separately.
- Derive live timing and actual durations from durable timestamps.
- Do not claim to control device brightness or guarantee wake lock.
- Do not use remote production fonts or other studio-time network dependencies.
- Do not render imported Markdown or YAML as executable HTML.
- The app and the authoring project (Claude project "Yin Flow State") are one integrated system. A change to a class or export schema is incomplete until `docs/yin-flow-state-instructions.md` is updated in the same change.

## Scope discipline

V1 is single-user and Pixel-6-first. Do not introduce general-purpose settings, multi-user abstractions, backend services, cross-device sync, student experiences, or pose media unless the product spec is deliberately revised by Clare.

Framework, parser library, and testing tools are implementation choices. Prefer the smallest maintainable approach that satisfies the acceptance tests.

## Workflow

- Start with the vertical slice in `README.md`.
- Convert each acceptance criterion into an automated or explicit manual test before calling the related feature complete.
- Use `fixtures/valid-desire-paths.md` as the first end-to-end class.
- Use the invalid fixtures to pin validation behavior.
- Test all time-dependent behavior with an injectable clock.
- Persist before presenting a teaching-state action as complete.
- Defer service-worker activation while a run is active.
- Verify the production build in airplane mode on the physical Pixel 6.

## Content and visual handling

- Treat `docs/design-system.md` as the visual authority; mock-ups do not override responsive or accessibility requirements.
- Expanded teaching content must scroll and must never be silently clipped.
- Honor reduced motion.
- Keep live screens visually sparse and reference/library screens deliberately denser.
- Preserve locally bundled font licensing files with the fonts.

## Protected history

Do not edit files in `archive/original-concept/`. They are provenance artifacts with recorded checksums.

Do not remove or rewrite `COGNITIVE-LINEAGE.md`. Append future substantial contributions according to its instructions.

## When a decision is missing

Do not bury a new product assumption in code. This project operates on the yes/no/triangulate primitive:

- Frame the missing decision as a question Clare can answer **yes** or **no**.
- If it cannot yet be framed that cleanly, mark it **triangulate** and triangulate it against the ends, means, and principles in `docs/product-spec.md` until it resolves into yes/no questions.
- Record the outcome in `docs/decision-log.md`, and ask Clare whenever the choice would materially change the room experience or stored history.
