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

# Desire Paths

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

## Transition: To Sleeping Swan

```yaml
id: transition-to-sleeping-swan
duration_min: 1
next_segment_id: sleeping-swan
setup: Roll to one side and come to all fours; bring the bolster lengthwise near the top of the mat.
alternative_offer: Offer reclined figure four before anyone settles into the forward shape.
```

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

## Transition: To Supported Caterpillar

```yaml
id: transition-to-supported-caterpillar
duration_min: 1
next_segment_id: supported-caterpillar
setup: Come to sitting with both legs forward and place the bolster lengthwise over the thighs.
alternative_offer: Bend the knees generously or sit on the folded blanket before folding.
```

## Pose: Supported Caterpillar

```yaml
id: supported-caterpillar
bilateral: false
duration_min: 6
entry: Extend both legs forward, soften the knees, and let the spine round toward the bolster.
target: Back body from heels through the spine.
settling: Choose enough height that the abdomen and breath remain uncompressed.
midpoint: Feel where gravity has made a path that effort no longer needs to hold.
props: Sit on the folded blanket; stack bolster and blocks to meet the forehead or chest.
alternative: Bend both knees and support them with the rolled blanket.
exit: Roll the spine upright slowly and pause with hands behind you.
notes: Peak of the sequence; allow the longest silence here.
```

## Transition: To Saddle

```yaml
id: transition-to-saddle
duration_min: 1
next_segment_id: saddle
setup: Come through one side to kneeling and move the bolster behind you lengthwise.
alternative_offer: Offer a low lunge or side-lying quad shape before anyone reclines.
```

## Pose: Saddle

```yaml
id: saddle
bilateral: true
duration_per_side_min: 3
side_order:
  - right
  - left
entry: Fold the named-side heel toward the outer hip and begin upright before choosing whether to recline.
target: Front thigh and hip flexors of the named side.
settling: Keep the knee sensation quiet and place support wherever the back asks for it.
midpoint: Let the front ribs soften without pushing the pelvis forward.
props: Bolster lengthwise behind the spine; block beneath the bolster for additional height.
alternative: Side-lying quad hold or a low lunge with the back knee padded.
exit: Press into the hands, rise slowly, and extend the named-side leg before changing sides.
notes: The alternative is equal, not a lesser version.
```

## Transition: To Reclined Twist

```yaml
id: transition-to-reclined-twist
duration_min: 1
next_segment_id: reclined-twist
setup: Come onto the back and place a block or folded blanket within reach of each side.
alternative_offer: Keep both feet grounded and let the knees travel only partway.
```

## Pose: Reclined Twist

```yaml
id: reclined-twist
bilateral: true
duration_per_side_min: 3
side_order:
  - right
  - left
entry: Draw the knees in and guide them toward the named side while both shoulders remain easy.
target: Outer hip, waist, and the rotational line of the spine.
settling: Support the knees so the twist can become passive rather than held.
midpoint: Let the opposite shoulder be heavy without insisting that it touch the floor.
props: Block or folded blanket beneath the knees.
alternative: Keep feet on the floor and windshield-wiper the knees through a smaller range.
exit: Bring the knees through center with the abdominal wall soft, then pause before changing sides.
notes: Begin reducing language in preparation for Savasana.
```

## Transition: To Savasana

```yaml
id: transition-to-savasana
duration_min: 1
next_segment_id: savasana
setup: Return through center, lengthen both legs, and arrange the bolster beneath the knees if desired.
alternative_offer: Rest with knees bent and feet wide if the lower back prefers it.
```

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

