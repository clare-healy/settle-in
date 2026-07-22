---
schema_version: 1
class_id: invalid-bilateral-duration
title: Bilateral Duration Error
date: 2026-08-11
scheduled_start_local: "19:00"
hard_close_local: "20:00"
theme_line: Fixture used only to test bilateral validation.
felt_sense: Four minutes must mean four minutes on each side.
peak_pose_id: bilateral-test
props:
  - 2 blocks per person
room_setup: []
arrival: Arrive in a comfortable seat.
breathwork: Natural breath.
---

# Bilateral Duration Error

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

## Pose: Bilateral Test

```yaml
id: bilateral-test
bilateral: true
duration_min: 4
side_order:
  - right
  - left
entry: Enter on the named side.
target: Test target.
settling: Settle without force.
midpoint: Notice the breath.
props: Use two blocks.
alternative: Rest on the back.
exit: Leave slowly.
notes: Validation fixture only.
```

## Transition: To Savasana

```yaml
id: transition-to-savasana
duration_min: 1
next_segment_id: savasana
setup: Return to the back and place the blocks aside.
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
