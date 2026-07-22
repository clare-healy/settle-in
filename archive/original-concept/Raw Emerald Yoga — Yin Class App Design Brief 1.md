# Raw Emerald Yoga — Yin Class App Design Brief

  

A single-purpose app for running the Tuesday 7 PM yin class from a Pixel phone, held in a

dim lower-level Scandia studio. **Function is first in every decision below.** The room —

candle-lit warmth, raw pine, troweled plaster, a deep charcoal lily-pond mural, one cool

indigo window — shows up only in the details, never at the cost of reading the screen from

across a quiet room in low light.

  

---

  

## 1. Palette

  

Every color is pulled from the photos. No pure white appears anywhere; the base is dark and

warm so the screen never blows out the candlelight.

  

| Hex | Name | Where it lives in the room | Role in the app |

|-----|------|----------------------------|-----------------|

| `#14181A` | **Pond Charcoal** | the darkest depths of the water-lily mural | App background |

| `#232E38` | **Deep Water Slate** | the blue-grey water higher in the mural | Raised surfaces — cards, the active panel |

| `#EADFC8` | **Taper Wax** | the lit ivory candle tapers (never quite white) | The large clock — brightest thing on screen |

| `#C6B79E` | **Curtain Linen** | the warm-lit tan curtains behind the mural | Primary text — pose names, cues |

| `#D6A66A` | **Candlelight Amber** | the candle-flame halo and warm glow on the curtains | Primary accent — active pose, progress, the 2-min message |

| `#C68C7F` | **Lotus Blush** | the dusty-rose lily pads in the mural | Secondary accent — gentle markers, "next" hints |

| `#3E3F6B` | **Mandala Indigo** | the cool indigo watercolor mandala on the window | The drift indicator (the one cool note) |

| `#A98C64` | **Raw Pine** | the sanded pine frame around the mural and the shelf | Dividers, hairlines, frame edges |

  

**Contrast (readable at arm's length in low light):** Taper Wax on Pond Charcoal ≈ 13:1;

Curtain Linen ≈ 9:1; Candlelight Amber ≈ 7.5:1 — all comfortable. Mandala Indigo is

deliberately quiet (≈ 2:1) — use it as a soft glowing bar, not for fine text. If the drift

indicator must carry a legible number, lighten it toward `#8586B0`.

  

---

  

## 2. Light quality

  

The room is lit **warm, low, and from small sources**: candle flames near the floor, a warm

LED strip framing the mirror, and daylight-then-lamplight filtered through tan curtains.

Light arrives in **soft pools**, not even wash; shadows are long, soft, and fall upward and

outward from those low sources. The only cool light in the whole space is the daylit window.

  

Three rules for the app:

  

1. **Light pools, it never shines.** Elevation and the active state read as a surface that is

*slightly warmer and slightly brighter* (Deep Water Slate lifted a touch toward amber),

with a soft feathered glow — never a hard highlight, gloss, or bright edge.

2. **Everything is warm except one thing.** All surfaces, text, and accents sit in the

warm range. Reserve Mandala Indigo as the single cool note (the drift indicator), exactly

as the indigo window is the room's single cool object.

3. **Shadows are soft and long.** If you use shadow at all, make it large, low-opacity, and

diffuse. No crisp drop shadows, no thin dark outlines.

  

---

  

## 3. Typography direction (free Google Fonts)

  

- **Clock + pose names → Hanken Grotesk.** A warm humanist sans with open shapes and clean

tabular numerals. The room is handmade, but the teacher has to read the time and the pose

across a dim room in a half-second — clarity wins. Hanken's softly rounded terminals keep

it from feeling clinical, so it belongs to this room without ever being hard to read. Use

its tabular figures for the clock so digits don't jump.

- **Body cues → Spectral.** A calm, low-contrast serif for the longer instructional lines

("soften the jaw, let the hips melt"). Its unhurried rhythm matches the slow yin pace and

the studio's "classical roots," and it reads cleanly at sentence length in low light.

  

Keep the type scale small: one big clock, one pose name, quiet supporting cues. No third font.

  

---

  

## 4. Texture and materiality

  

Four materials define the room. Each informs the interface in exactly one restrained way —

and if a texture ever costs legibility, drop it.

  

- **Troweled plaster walls (matte, warm).** The background may carry a *barely-there* warm

matte grain or a soft radial warm vignette — enough to feel like plaster, never enough to

register as noise. Matte only; no gloss anywhere.

- **Raw pine framing (sanded, soft-edged).** Corner radius is modest and softened, like a

sanded wood edge (~8–12px) — present but not pill-shaped. Dividers are thin warm Raw Pine

lines, like the edge of the mural frame, not grey rules.

- **Candle wax + watercolor (soft, bleeding edges).** Glows — the active pose, the 2-minute

message — have feathered, softly-blurred edges, like a candle halo or watercolor bloom.

Never a hard-edged box or badge.

- **Wax and lamplight are diffuse, not shiny.** No glossy gradients, no glassy buttons.

Everything should read as lit matte plaster and wood.

  

---

  

## 5. Motion

  

Nothing on screen should move faster than a slow breath. The app allows only gentle state

changes, plus the one fading-in 2-minute message.

  

- **State changes cross-fade, they don't slide or snap.** Pose-to-pose transitions: opacity

and a tiny (2–4px) settle, **600–800ms**, easing `cubic-bezier(0.25, 0.10, 0.25, 1.0)`

(an "exhale" curve — arrives gently, no bounce).

- **The 2-minute signal.** The message fades in very slowly, like a candle brightening or

ink blooming in water: opacity 0→1 over **~3s**, `ease-out`, with an optional 3–4px upward

settle. Let it hold, then fade out over **~2.5s** if it leaves at all.

- **No springs, bounces, spinners, or attention flashes.** The drift indicator changes by

slow opacity/length shifts only. If it's calm in the room, it's calm on the screen.

  

---

  

## 6. What this app never looks like

  

Grounded in the photos — these are the moves that would betray the room:

  

- **Never a white or bright screen.** No `#FFF`, no light mode; it would flood a candlelit

studio. The room has no pure white — neither does the app.

- **Never cold, clinical, or neon.** No blue "tech" chrome, no saturated status colors, no

red error toasts. The only cool note is the single indigo from the window.

- **Never glossy or glassy.** No shiny gradients, glass cards, or floating drop-shadowed

panels. The room is matte plaster, raw wood, and wax.

- **Never hard-edged.** No crisp grey hairlines, boxed badges, or sharp Material-style

elevation. Edges are soft, like sanded pine and watercolor.

- **Never decorated with spiritual clip-art.** No mandala, om, or lotus icons as UI. The

room already holds those as real objects — the app stays quiet so the room can speak.

- **Never busy or urgent.** No emoji, no bounce, no fast snaps, no notification badges.

Everything moves at the pace of a yin hold.