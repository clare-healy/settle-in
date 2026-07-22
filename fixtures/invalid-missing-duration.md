---
schema_version: 1
class_id: invalid-missing-duration
title: Missing Duration Example
date: 2026-08-04
scheduled_start_local: "19:00"
hard_close_local: "20:00"
theme_line: Fixture used only to test validation.
felt_sense: The importer should point to the missing field.
peak_pose_id: test-pose
props:
  - 1 blanket per person
room_setup: []
arrival: Arrive on the back.
breathwork: Natural breath.
---

# Missing Duration Example

## Grounding

```yaml
id: grounding
duration_min: 10
theme_anchor: This is a validation fixture.
yin_principles:
  - Find a workable edge.
  - Keep sensation moderate.
  - Become still.
guided_silent_ratio: Brief guidance, then silence.
```

## Pose: Test Pose

```yaml
id: test-pose
bilateral: false
entry: Enter the shape.
target: Test target.
settling: Settle without force.
midpoint: Notice the breath.
props: Use a blanket.
alternative: Rest on the back.
exit: Leave slowly.
notes: Validation fixture only.
```

## Transition: To Savasana

```yaml
id: transition-to-savasana
duration_min: 1
next_segment_id: savasana
setup: Return to the back and arrange the blanket.
alternative_offer: Rest with knees bent if preferred.
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
