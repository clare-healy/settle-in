# Settle In

Build-context package for a quiet, offline-first teaching instrument used by Clare to run her Tuesday 7 PM yin class at Raw Emerald Yoga from a Google Pixel 6.

This repository currently contains the canonical product and implementation context. It does not yet contain the application itself.

## Read this first

The documents have distinct authority:

1. [`docs/product-spec.md`](docs/product-spec.md) defines the product ends, means, principles, scope, and user-visible behavior.
2. [`docs/implementation-treaty.md`](docs/implementation-treaty.md) defines runtime state, timing, persistence, recovery, and the delivery architecture.
3. [`docs/class-format.md`](docs/class-format.md) defines the AI-authored Markdown treaty and normalized data model.
4. [`docs/screen-states.md`](docs/screen-states.md) defines every v1 screen, state, action, and edge case.
5. [`docs/design-system.md`](docs/design-system.md) defines the visual system and its accessibility constraints.
6. [`docs/acceptance-tests.md`](docs/acceptance-tests.md) defines what must be true before v1 is used in a live class.

[`docs/decision-log.md`](docs/decision-log.md) records when and why material decisions were made, operating on the yes/no/triangulate primitive; it does not outrank the canonical documents above.

[`docs/yin-flow-state-instructions.md`](docs/yin-flow-state-instructions.md) is the canonical source of the Claude "Yin Flow State" project instructions. The app and that authoring project are one integrated system: schema changes update both sides in the same change.

Implementation agents must also follow [`AGENTS.md`](AGENTS.md).

If two documents appear to conflict, resolve the conflict in this order:

1. Ends and principles in the product spec
2. Explicit locked decisions in the implementation treaty
3. Class-format treaty
4. Screen-state treaty
5. Design-system details

Do not silently choose between conflicting requirements during implementation. Record and resolve the conflict in the relevant canonical document.

## Non-negotiable invariants

- The app never emits sound, vibration, or a system notification.
- Clare advances every teaching segment manually.
- The only automatic in-class signal is silent text appearing on screen two minutes before the hard 8:00 PM close.
- The app works after installation without a network connection.
- A class plan remains immutable; each taught run is recorded separately.
- The wall clock is primary. Timing informs rather than commands.
- A bilateral pose duration is per side. A bilateral pose marked `4 min` occupies four minutes on Side 1 and four minutes on Side 2.
- 8:00 PM is a hard class end, even after a late start.
- Device brightness remains under Clare's control; the app supplies a low-glare dark interface but does not claim to control hardware brightness.

## Repository map

```text
.
├── README.md
├── CLAUDE.md
├── AGENTS.md
├── COGNITIVE-LINEAGE.md
├── docs/
│   ├── product-spec.md
│   ├── implementation-treaty.md
│   ├── class-format.md
│   ├── screen-states.md
│   ├── design-system.md
│   ├── acceptance-tests.md
│   ├── decision-log.md
│   ├── yin-flow-state-instructions.md
│   ├── build-plan.md
│   ├── adversarial-review-prompt.md
│   └── phase-1-adversarial-review.md
├── fixtures/
│   ├── valid-desire-paths.md
│   ├── valid-boundary-content.md
│   ├── warning-short-plan.md
│   ├── invalid-missing-duration.md
│   ├── invalid-bilateral-duration.md
│   └── expected-validation-errors.md
├── mockups/
│   └── README.md
├── reference-photos/
│   ├── README.md
│   └── (four studio photographs, descriptively named)
└── archive/
    └── original-concept/
```

## Delivery target

The v1 implementation is a small static Progressive Web App installed from HTTPS onto a Pixel 6. It may use several deployment files—HTML, a web app manifest, a service worker, icons, and locally bundled fonts—but has no runtime server, user account, cloud database, analytics, or network dependency after installation.

The multi-file packaging is an implementation means. It may not broaden the product, weaken offline reliability, or violate the product principles.

## Inputs still to be added

- Wireframes from Claude Design in `mockups/`, prioritized for the four highest-visual-risk states (see `mockups/README.md`); wireframes refine the build, they do not gate it
- One final, real class file generated through the Yin Flow State authoring workflow (this also validates the workflow itself)

Studio reference photographs arrived July 21, 2026, and live in `reference-photos/` with descriptive names. They refine the build; they do not reopen the core product decisions unless they expose a conflict with dim-room usability.

## First implementation slice

Build one complete vertical path before expanding the library experience:

1. Import and validate `fixtures/valid-desire-paths.md`.
2. Show Prep.
3. Begin and run the class through Grounding, poses, transitions, and Savasana.
4. Survive backgrounding and a cold reopen during the run.
5. Finish, derive the as-taught record, add optional notes, and export it.
6. Prove the same path in airplane mode on the Pixel 6.

Only after that path works should library refinements or nonessential polish expand.
