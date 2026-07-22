# Mock-ups

Place current and future screen references here.

## Required delivery format

Claude Design source files may be included, but every source must also have a portable reference that can be opened without Claude's design runtime:

- PNG at the intended Pixel 6 viewport, or
- Self-contained HTML with no missing local runtime such as `support.js`

Name related files consistently, for example:

```text
pose-minimal.source.dc.html
pose-minimal.pixel6.png
```

Include the viewport size, Android font scale, source date, and relevant screen-state section in a nearby Markdown note when those details are not embedded.

## Frames for v1

Wireframes refine the build; they do not gate it (see `docs/screen-states.md`, Reference wireframes). Highest-priority frames, worth commissioning from Claude Design before visual lock:

- Pose minimal with a long title
- Pose expanded with overflowing copy
- Savasana
- Two-minute callout outside Savasana

Welcome refinements whenever they arrive:

- Empty library
- Import input
- Import blocking errors
- Import confirmation
- Grounding minimal and expanded
- Transition
- Post-Class Notes
- Library list and detail
- Run Recovery
- Leave Class guard
- Wake-lock unavailable

The original first-look `.dc.html` mock-up is preserved in `archive/original-concept/`.

## Authority

Mock-ups demonstrate hierarchy and visual intent. They do not override product invariants, timing equations, data rules, responsive behavior, accessibility, or the screen-state treaty.
