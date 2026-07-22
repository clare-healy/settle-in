---
schema_version: 1
class_id: warning-short-plan
title: Short Plan Warning
date: 2026-08-18
scheduled_start_local: "19:00"
hard_close_local: "20:00"
theme_line: Fixture used only to test the warning path.
felt_sense: A short plan should warn without blocking.
peak_pose_id: sleeping-swan
props:
  - 1 bolster per person
  - 1 blanket per person
room_setup: []
arrival: Arrive on the back and let the breath settle.
breathwork: Natural breath with a slightly longer exhale.
---

# Short Plan Warning

## Grounding

```yaml
id: grounding
duration_min: 10
theme_anchor: This is a validation fixture for the warning path.
yin_principles:
  - Find a workable edge.
  - Keep sensation moderate.
  - Become still.
guided_silent_ratio: Brief guidance, then silence.
```

## Pose: Supported Butterfly

```yaml
id: supported-butterfly
bilateral: false
duration_min: 5
entry: Bring the soles of the feet together and let the knees widen.
target: Inner thighs and groins.
settling: Choose a sensation between 2 and 5 out of 10.
midpoint: Notice whether the body is still negotiating with gravity.
props: Bolster lengthwise behind the spine.
alternative: Keep the feet farther forward.
exit: Help the knees together and pause before rolling to one side.
notes: Validation fixture only.
```

## Transition: To Sleeping Swan

```yaml
id: transition-to-sleeping-swan
duration_min: 1
next_segment_id: sleeping-swan
setup: Roll to one side and come to all fours.
alternative_offer: Offer reclined figure four before anyone settles.
```

## Pose: Sleeping Swan

```yaml
id: sleeping-swan
bilateral: true
duration_per_side_min: 4
side_order:
  - right
  - left
entry: From all fours, bring the named-side shin forward.
target: Outer hip and glute of the forward-leg side.
settling: Fold only as far as breath and jaw remain easy.
midpoint: Let the top hip roll gently open.
props: Bolster lengthwise beneath the chest.
alternative: Reclined figure four, using the same named side.
exit: Press back to all fours and pause in neutral.
notes: Validation fixture only.
```

## Transition: To Savasana

```yaml
id: transition-to-savasana
duration_min: 1
next_segment_id: savasana
setup: Return to the back and lengthen both legs.
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
