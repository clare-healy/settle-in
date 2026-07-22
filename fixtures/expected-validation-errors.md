# Expected Fixture Results

These messages define meaning, not mandatory punctuation. Implementations may improve phrasing while retaining the segment, field, cause, and correction.

## `valid-desire-paths.md`

- Blocking errors: none
- Warnings: none
- Planned duration: 60 minutes
- Authored poses: 5
- Teaching sides: 8
- Transitions: 5
- Peak pose: Supported Caterpillar
- Grounding planned window at a 7:00 start: 7:00–7:10
- Savasana planned window at a 7:00 start: 7:45–8:00
- Hard-close message: 7:58

## `valid-boundary-content.md`

- Blocking errors: none
- Warnings: none
- Planned duration: 60 minutes
- Authored poses: 4
- Teaching sides: 6
- Transitions: 4
- Peak pose: Supported Caterpillar
- Boundary content, all on the first pose: 36-character pose title, 150-character midpoint cue, 280-character entry cue (each exactly at its warning threshold, so none fires)

## `warning-short-plan.md`

- Blocking errors: none
- Warnings: exactly one

Expected warning:

> Planned duration is 40 minutes, shorter than the 60-minute scheduled class. The class can still be imported.

Import proceeds to confirmation; the warning is shown with the import summary and does not block saving.

## `invalid-missing-duration.md`

Blocking error:

> Test Pose · duration_min is required when bilateral is false.

The error should identify the Pose block's source line when possible. Planned-duration warnings may be withheld until blocking duration errors are corrected.

## `invalid-bilateral-duration.md`

Blocking errors:

> Bilateral Test · duration_per_side_min is required when bilateral is true.

> Bilateral Test · duration_min is not allowed for a bilateral pose. Four minutes must be declared as duration_per_side_min: 4, meaning four minutes on each side.

