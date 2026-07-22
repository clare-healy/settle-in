# Raw Emerald Yoga — Design System

Status: canonical visual and motion direction for v1

## Design intent

The app is used in a dim lower-level studio lit by candles and warm practical light. Raw pine, troweled plaster, a charcoal water-lily mural, and one cool indigo window inform the interface.

Function comes first. The room appears through restrained color, light, edge, and rhythm; it never becomes decoration that competes with a two-second glance.

## Color tokens

| Token | Hex | Use |
|---|---:|---|
| `pond-charcoal` | `#14181A` | Primary app background |
| `deep-water-slate` | `#232E38` | Raised and reference surfaces |
| `taper-wax` | `#EADFC8` | Wall clock and highest-priority text |
| `curtain-linen` | `#C6B79E` | Primary pose and cue text |
| `candlelight-amber` | `#D6A66A` | Live state, peak marker, primary action, wake message |
| `lotus-blush` | `#C68C7F` | Next destination and functional alternative |
| `mandala-indigo` | `#3E3F6B` | Non-text drift surface only |
| `legible-indigo` | `#8586B0` | Drift text |
| `raw-pine` | `#A98C64` | Dividers, labels, and frame edges |

Opaque contrast on Pond Charcoal is approximately:

- Taper Wax: 13.5:1
- Curtain Linen: 9.1:1
- Candlelight Amber: 8.1:1
- Lotus Blush: 6.4:1
- Raw Pine: 5.6:1
- Legible Indigo: 5.1:1
- Mandala Indigo: 1.8:1 and therefore never used for meaningful text

Opacity changes alter contrast. Every actual foreground/background combination must be tested after compositing. Meaningful text should meet WCAG AA contrast; primary glance information should target stronger contrast than the minimum.

Inactive savasana steps may be visually quiet, but must remain legible at close reference distance. Do not use very low opacity as the only way to indicate state.

## Light and surfaces

### Light pools; it does not shine

Active surfaces may become slightly warmer and brighter with a large feathered glow. Avoid hard highlights, glossy gradients, bright outlines, and glass effects.

### Warm except for drift

The only cool note is the indigo drift treatment. Error, success, and warning states remain within the warm system and communicate through text and structure rather than conventional saturated red or green.

### Soft edges

- Standard surface radius: 10–12px
- Large action radius: no more than 14px
- Do not turn ordinary controls into pills unless the compact form communicates a chip or status
- Dividers use low-contrast Raw Pine, not neutral gray

### Texture

A very subtle matte grain or warm radial vignette is allowed on backgrounds. It must disappear perceptually behind text and must not increase GPU or battery cost unnecessarily.

## Typography

Bundle the fonts locally for offline use.

- Hanken Grotesk: wall clock, pose names, navigation, labels, status, and data
- Spectral: teaching cues, theme language, notes, and reflective copy
- System fallbacks must preserve legibility if font loading fails
- Use tabular figures for wall clock, elapsed time, planned windows, and drift

Recommended starting sizes on the Pixel 6:

| Role | Size | Notes |
|---|---:|---|
| Live wall clock | `clamp(72px, 23vw, 104px)` | Highest hierarchy |
| Savasana clock | 52–64px | Still glanceable, quieter than pose run |
| Pose name | 26–32px | Allow two lines without collision |
| Minimal midpoint cue | 17–19px | Spectral, line height 1.45–1.55 |
| Expanded body cue | 16–18px | Close-reference reading |
| Prep and library body | 16px minimum | Avoid dense miniature layouts |
| Secondary timing | 14px minimum | Increase contrast before reducing size |
| Eyebrow label | 11–12px | Nonessential support only; spaced uppercase |

The original phrase “keep the type scale small” means keep the number of hierarchy levels small, not make important text physically tiny.

## Layout

- Portrait-first, responsive to the usable viewport
- Respect `env(safe-area-inset-*)`
- Do not reproduce a simulated phone bezel in the app
- Keep the wall clock in a stable location across live screens
- Maintain a compact sticky header in expanded references
- Expanded content scrolls; authored copy is never silently clipped
- Primary actions remain reachable above system navigation UI
- Use generous negative space on live screens and denser information only in Prep, expanded reference, Post-Class, and Library

## Touch and navigation

- Minimum effective target: 48 × 48 CSS pixels
- Live Previous and Next zones occupy 20% each, inset from system gesture edges
- Center reference zone occupies 60%
- Provide subtle visible affordances for all three zones
- Do not attach different destructive and nondestructive meanings to nearly identical gestures
- No swipe is required for core operation

## Motion

Nothing moves faster than a slow breath.

- Segment transition: cross-fade plus 2–4px settle over 600–800ms
- Easing: `cubic-bezier(0.25, 0.10, 0.25, 1.0)`
- Wake message: one fade from opacity 0 to 1 over approximately three seconds; remain visible afterward
- No bounce, spring, shimmer, spinner, flashing, or looping attention motion
- A small active savasana marker may be static; continuous flame pulsing is not necessary

Honor `prefers-reduced-motion: reduce` by eliminating the positional settle and shortening cross-fades. The wake message may appear through a short non-positional fade or immediately.

## States and feedback

- Primary action: warm amber edge or surface lift, not a bright filled block
- Pressed state: immediate subtle luminance change; do not delay functional feedback for the full slow transition duration
- Focus state: clearly visible warm outline for keyboard and assistive testing
- Warning/error: plain-language heading, location, and resolution; color is supplemental
- Disabled state: retain enough contrast to be understood as unavailable
- Drift: cool indigo surface with Legible Indigo text; never animated as urgency

## What the app never looks or feels like

- No white or light-mode screen
- No neon, clinical blue chrome, saturated status color, or alarm red takeover
- No glossy gradients or glass cards
- No mandala, lotus, om, or generic spiritual iconography
- No notification badges, emoji, celebratory animation, or gamification
- No automatic motion that implies the teacher should hurry
- No dense dashboard on the live teaching surface

## App identity (web app manifest)

- Name: `Settle In`
- `short_name`: `Settle In`
- Icon: a minimal taper-candle silhouette in Taper Wax with a small Candlelight Amber flame, on a Pond Charcoal field. Maskable-safe margins; must remain legible at 48px on a dark launcher. No spiritual iconography.
- `theme_color`: `#14181A` (Pond Charcoal — Android system bars stay dark)
- `background_color`: `#14181A` (the launch splash must never flash bright in the dim studio)
- `display`: `standalone`; `orientation`: `portrait`

## Visual verification

Every release candidate must be checked:

- On the physical Pixel 6
- At Clare's normal arm and placement distance
- In the actual studio lighting or a credible low-light approximation
- At normal and 125% Android font scaling
- With the longest fixture content
- With airplane mode enabled so fallback fonts or missing assets cannot hide

