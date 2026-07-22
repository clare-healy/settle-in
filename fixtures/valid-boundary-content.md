---
schema_version: 1
class_id: valid-boundary-content
title: Boundary Content
date: 2026-08-25
scheduled_start_local: "19:00"
hard_close_local: "20:00"
theme_line: Fixture pinning the copy-length boundaries for layout testing.
felt_sense: The longest allowed content should still read as one quiet glance.
peak_pose_id: supported-caterpillar
props:
  - 1 bolster per person
  - 2 blocks per person
  - 1 blanket per person
room_setup: []
arrival: Arrive on the back and let the breath settle before the theme is named.
breathwork: Slow nasal breathing with a longer exhale; become silent after three rounds.
---

# Boundary Content

## Grounding

```yaml
id: grounding
duration_min: 10
theme_anchor: This fixture exercises the longest copy the schema allows without warnings.
yin_principles:
  - Find a workable edge.
  - Keep sensation moderate.
  - Become still.
guided_silent_ratio: Brief guidance, then silence.
```

## Pose: Deeply Supported Reclining Butterfly

```yaml
id: deeply-supported-reclining-butterfly
bilateral: false
duration_min: 6
entry: Bring the soles of the feet together and let both knees widen onto the supports, then walk the shoulder blades down the bolster until the head is fully held; pause, let the arms rest wherever they are heaviest, and allow the whole back body to arrive before anything deepens here.
target: Inner thighs, groins, and the front of the pelvis.
settling: Choose a sensation between 2 and 5 out of 10 and let the props do the holding.
midpoint: Notice where the breath has become easy again and let the shape hold you rather than the other way round; there is nothing left here for effort to do.
props: Bolster lengthwise behind the spine; blocks under both outer thighs.
alternative: Keep the feet farther forward or rest with knees bent and feet wide.
exit: Help the knees together with the hands and pause before rolling to one side.
notes: Layout fixture; all three copy boundaries live on this pose.
```

## Transition: To Sleeping Swan

```yaml
id: transition-to-sleeping-swan
duration_min: 1
next_segment_id: sleeping-swan
setup: Roll to one side and come to all fours; bring the bolster near the top of the mat.
alternative_offer: Offer reclined figure four before anyone settles.
```

## Pose: Sleeping Swan

```yaml
id: sleeping-swan
bilateral: true
duration_per_side_min: 5
side_order:
  - right
  - left
entry: From all fours, bring the named-side shin forward and extend the other leg behind you.
target: Outer hip and glute of the forward-leg side.
settling: Fold only as far as breath and jaw remain easy.
midpoint: Let the top hip roll gently open.
props: Bolster lengthwise beneath the chest.
alternative: Reclined figure four, using the same named side.
exit: Press back to all fours and pause in neutral.
notes: Boundary fixture only.
```

## Transition: To Supported Caterpillar

```yaml
id: transition-to-supported-caterpillar
duration_min: 1
next_segment_id: supported-caterpillar
setup: Come to sitting with both legs forward and place the bolster over the thighs.
alternative_offer: Bend the knees generously before folding.
```

## Pose: Supported Caterpillar

```yaml
id: supported-caterpillar
bilateral: false
duration_min: 7
entry: Extend both legs forward, soften the knees, and let the spine round toward the bolster.
target: Back body from heels through the spine.
settling: Choose enough height that the abdomen and breath remain uncompressed.
midpoint: Feel where gravity has made a path that effort no longer needs to hold.
props: Sit on the folded blanket; stack bolster and blocks to meet the forehead.
alternative: Bend both knees and support them with the rolled blanket.
exit: Roll the spine upright slowly and pause with hands behind you.
notes: Peak of the sequence.
```

## Transition: To Reclined Twist

```yaml
id: transition-to-reclined-twist
duration_min: 1
next_segment_id: reclined-twist
setup: Come onto the back and place a block within reach of each side.
alternative_offer: Keep both feet grounded and let the knees travel partway.
```

## Pose: Reclined Twist

```yaml
id: reclined-twist
bilateral: true
duration_per_side_min: 4
side_order:
  - right
  - left
entry: Draw the knees in and guide them toward the named side while both shoulders remain easy.
target: Outer hip, waist, and the rotational line of the spine.
settling: Support the knees so the twist can become passive.
midpoint: Let the opposite shoulder be heavy without insisting it touch the floor.
props: Block or folded blanket beneath the knees.
alternative: Keep feet on the floor and move the knees through a smaller range.
exit: Bring the knees through center, then pause before changing sides.
notes: Boundary fixture only.
```

## Transition: To Savasana

```yaml
id: transition-to-savasana
duration_min: 1
next_segment_id: savasana
setup: Return through center and lengthen both legs.
alternative_offer: Rest with knees bent and feet wide if preferred.
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
