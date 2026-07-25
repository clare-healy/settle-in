# Yin Class Markdown Treaty — Schema v1

Status: canonical AI-authoring, import, and as-taught export treaty

## Purpose

An AI assistant produces one Markdown document per authored class. The file remains readable by Clare while giving the app an unambiguous machine treaty.

The app stores both the original Markdown and a normalized `ClassDefinition` generated from it.

## Encoding and file rules

- UTF-8 Markdown with `.md` extension
- YAML front matter at the top
- `schema_version: 1`
- One H1 title matching the front-matter title
- Ordered H2 segment headings
- Exactly one fenced `yaml` block immediately beneath each segment heading
- Each fenced YAML block is a single document parsed to an AST with the core schema; directives, tags, anchors, aliases, multiple documents, non-string keys, and non-finite numbers are rejected before conversion
- Unknown fields produce warnings in v1 unless they begin with `x_`
- Duplicate keys are blocking errors at every nesting depth
- Over-budget input (file size, line count, nesting depth, node count, scalar length) is rejected before parsing; canonical caps live in the build plan

## Front matter

Required fields:

```yaml
---
schema_version: 1
class_id: desire-paths-2026-07-28
title: Desire Paths
date: 2026-07-28
scheduled_start_local: "19:00"
hard_close_local: "20:00"
theme_line: Where you place your attention is where the path forms.
felt_sense: Notice the route attention takes before asking it to change.
peak_pose_id: supported-caterpillar
props:
  - 1 bolster per person
  - 2 blocks per person
  - 1 blanket per person
room_setup:
  - Preserve wall space along the mural side.
arrival: Bring everyone onto their backs and allow a few unstructured breaths before naming the theme.
breathwork: Slow nasal breathing with a longer exhale; become silent after three guided rounds.
---
```

Rules:

- `class_id` is stable kebab-case and unique to this authored class.
- `date` is an ISO local date.
- Local times use zero-padded 24-hour `HH:MM` strings.
- For v1, `hard_close_local` must be `20:00` and later than `scheduled_start_local`.
- The canonical class is Tuesday 19:00–20:00. A `date` that is not a Tuesday or a `scheduled_start_local` other than `"19:00"` is valid but produces a warning, so shifted weeks, subbing, and rehearsal files import without any scheduling UI.
- `props` is a nonempty list of display-ready strings.
- `room_setup` may be an empty list.
- `arrival`, `breathwork`, `theme_line`, and `felt_sense` are single display paragraphs.
- `peak_pose_id` must match exactly one pose ID.

## Grounding

Exactly one Grounding segment must be first.

````markdown
## Grounding

```yaml
id: grounding
duration_min: 10
theme_anchor: >-
  Attention makes a path by returning. Tonight we notice the return before we try to redirect it.
yin_principles:
  - Find the first workable edge rather than the deepest shape.
  - Let sensation remain in the 2–5 range out of 10.
  - Give stillness time to become informative.
guided_silent_ratio: Guide the first four minutes, then leave longer quiet intervals.
```
````

Rules:

- `id` must be `grounding`.
- `duration_min` is a positive whole number.
- `yin_principles` contains exactly three short strings.
- All other fields are required nonempty text.

## Non-bilateral pose

Use `bilateral: false` and `duration_min`.

````markdown
## Pose: Supported Butterfly

```yaml
id: supported-butterfly
bilateral: false
duration_min: 4
entry: Bring the soles of the feet together and let the knees widen without pressing them down.
target: Inner thighs, groins, and the front of the pelvis.
settling: Let the support receive the legs; choose a sensation between 2 and 5 out of 10.
midpoint: Notice whether the body is still negotiating with gravity.
props: Bolster lengthwise behind the spine; blocks or folded blanket under the outer thighs.
alternative: Keep the feet farther forward or rest with knees bent and feet wide.
exit: Help the knees together with the hands and pause before rolling to one side.
notes: Keep the opening spacious; do not over-explain the theme here.
```
````

## Bilateral pose

Use `bilateral: true`, `duration_per_side_min`, and an explicit two-item `side_order`.

````markdown
## Pose: Sleeping Swan

```yaml
id: sleeping-swan
bilateral: true
duration_per_side_min: 4
side_order:
  - right
  - left
entry: From all fours, bring the named-side shin forward and extend the other leg behind you.
target: Outer hip and glute of the forward-leg side.
settling: Fold only as far as breath and jaw remain easy; stay between 2 and 5 out of 10.
midpoint: Let the top hip roll gently open without forcing the front knee.
props: Bolster lengthwise beneath the chest; blanket under the forward-side hip if needed.
alternative: Reclined figure four, using the same named side.
exit: Press back to all fours and pause in neutral before changing sides or moving on.
notes: Offer the reclined version early for sensitive knees.
```
````

Rules for all poses:

- `id` is unique kebab-case.
- A bilateral pose represents two runtime segments and consumes twice `duration_per_side_min`.
- `side_order` must contain exactly two distinct supported side labels. Schema v1 supports `right` and `left`.
- A bilateral pose must not contain `duration_min`.
- A non-bilateral pose must not contain `duration_per_side_min` or `side_order`.
- All cue fields are required. Use a short intentional sentence rather than `N/A`.
- Pose cue copy is shared across sides and uses “named side” where necessary.

## Transition

Transitions are explicit and appear between teaching headings. Their destination reference must match the following pose or Savasana segment.

````markdown
## Transition: To Sleeping Swan

```yaml
id: transition-to-sleeping-swan
duration_min: 1
next_segment_id: sleeping-swan
setup: Come through one side to all fours; bring the bolster lengthwise near the top of the mat.
alternative_offer: Offer reclined figure four before anyone settles into the forward shape.
```
````

Rules:

- `duration_min` is a positive whole number.
- `next_segment_id` must equal the ID of the next pose or Savasana segment in source order.
- Transition copy describes setup for the next pose, not the pose being exited.

## Savasana

Exactly one Savasana segment must be last.

````markdown
## Savasana

```yaml
id: savasana
duration_min: 15
steps:
  - Settle
  - Body scan
  - Breath softens
  - Stillness
  - Return of breath
  - Gentle awakening
wake_message: Two minutes. Time to begin the gentle awakening.
```
````

Rules:

- `id` must be `savasana`.
- Schema v1 requires exactly six nonempty steps.
- `wake_message` is required and authored per class; it is the exact text shown, verbatim, on the Savasana screen once the clock reaches two minutes before the hard close. It appears on no other screen. Keep it glanceable — a warning appears above 90 characters.

## Sequence validation

Blocking validation rules:

- Grounding is first and unique.
- Savasana is last and unique.
- At least one pose exists.
- IDs are unique.
- `peak_pose_id` resolves to one pose.
- Transition references resolve and match source order.
- Every authored pose is followed by exactly one Transition leading to the next authored pose or to Savasana. Generated Side 1 to Side 2 movement does not require an authored Transition.
- Durations follow bilateral rules.
- Expanded planned duration is no longer than the scheduled-start-to-hard-close interval.
- For the canonical Tuesday class, the planned duration should normally equal 60 minutes. A shorter plan is allowed with a warning; a longer plan is blocked.
- Required cue fields are nonempty.

## Normalized ClassDefinition

The importer produces an object equivalent to:

```text
ClassDefinition
  schemaVersion
  classId
  revisionId
  sourceHash
  title
  date
  scheduledStartLocal
  hardCloseLocal
  themeLine
  feltSense
  peakPoseId
  props[]
  roomSetup[]
  arrival
  breathwork
  authoredSegments[]
  expandedRuntimeSegments[]
  plannedDurationSec
  originalMarkdown
```

Every expanded runtime segment contains:

- Stable expanded ID
- Parent authored-segment ID
- Type
- Side when applicable
- Planned duration in seconds
- Planned offset in seconds
- Display and cue fields required by its screen

Recommended bilateral expanded IDs are `sleeping-swan--right` and `sleeping-swan--left`.

## Copy guidance

Validation warnings, not blocking errors, should appear when:

- Pose name exceeds 36 characters
- Any minimal-state midpoint cue exceeds 150 characters
- Any expanded cue exceeds 280 characters
- Arrival, breathwork, theme anchor, or guided/silent note exceeds 320 characters
- `wake_message` exceeds 90 characters
- More than 14 authored poses appear

Warnings protect the two-second-glance principle while allowing Clare to make the final teaching judgment.

## Import summary

Before saving, show:

- Title and date
- Scheduled start and hard close
- Expanded planned duration
- Authored pose count
- Teaching-side count
- Transition count
- Savasana duration
- Peak pose
- Consolidated props and room setup
- Warning count

## As-taught export — Export Schema v1

The as-taught export is the return path of the authoring loop. Clare gives the exported record back to the authoring assistant, which reads honest history and pose recency from it when constructing future classes. It is the means behind the end "each taught class strengthens future class construction."

The export is derived entirely from the run's event history and post-class notes. It is generated, never hand-edited, and re-exporting the same completed run always produces an equivalent document.

### Front matter

```yaml
---
export_schema_version: 1
kind: as-taught-run
class_id: desire-paths-2026-07-28
class_title: Desire Paths
class_date: 2026-07-28
revision_source_hash: "<source hash of the exact class revision taught>"
run_id: "<run identifier>"
run_local_date: 2026-07-28
run_started_at: "2026-07-28T19:02:41-05:00"
run_finished_at: "2026-07-28T19:59:37-05:00"
hard_close_at: "2026-07-28T20:00:00-05:00"
app_version: "<application version>"
---
```

### Body

One H1: `As Taught — {class title} — {run local date}`.

A `## Segments` section containing exactly one fenced `yaml` block: an ordered list with exactly one entry per expanded runtime segment, in canonical expanded-plan order (the authored plan's order, not visit order). `visits` and `status: revisited` summarize out-of-order teaching; visit-level detail lives in the run's event history, not in this summary.

```yaml
- id: sleeping-swan--right
  parent_id: sleeping-swan
  type: pose
  name: Sleeping Swan
  side: right
  planned_sec: 240
  actual_sec: 305
  status: long
  visits: 1
  substituted_with: null
```

Rules:

- `type` is one of `grounding`, `pose`, `transition`, `savasana`.
- `side` appears only on bilateral side segments.
- `planned_sec` and `actual_sec` are integer seconds. `actual_sec` is the sum of the segment's completed visits.
- `status` is one of `on-plan`, `long`, `short`, `revisited`, `skipped`, `substituted`, with precedence `skipped` > `substituted` > `revisited` > timing status.
- Timing status: a segment is `long` or `short` when the difference between actual and planned exceeds the greater of 30 seconds and 15% of planned duration; otherwise `on-plan`. These thresholds are the v1 default; field evidence may tune them under the field-learning rule, recorded in the decision log.
- A skipped segment has `actual_sec: 0`. On a completed run, a segment with zero recorded visits derives `skipped` automatically — the app knows it was never taught and never asks Clare to say so. `substituted_with` is retained in the schema for honest history and for runs recorded before manual correction was retired; nothing in the current app sets it.
- `substituted_with` carries the short replacement name Clare entered, otherwise `null`.

A `## Room note` section containing Clare's note verbatim, or the single line `None recorded.`

### Recency

Pose recency is derived from accumulated as-taught exports: each export carries pose IDs, sides, statuses, and the run date, which is sufficient for the authoring assistant to answer when a pose was last taught and how it actually went. The app maintains no in-app recency view in v1.

## Versioning

The as-taught export carries `export_schema_version`, versioned independently of the class-input `schema_version`. The authoring-side instructions in `docs/yin-flow-state-instructions.md` must be updated in the same change as any revision to either schema.

The app must reject an unsupported future `schema_version` without partially importing it. The error should preserve the source and explain that the app must be updated before the class can be used.

Schema changes require a new fixture set and a documented migration. Never reinterpret an already imported schema-v1 class silently.
