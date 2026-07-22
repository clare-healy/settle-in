// Recovery snapshot derivation.
//
// docs/implementation-treaty.md § Recovery treaty: on launch with an unfinished
// active run, show a calm recovery screen with class title and date, actual
// start time, last active segment and side, current wall time, and Resume as the
// primary action. This module derives that snapshot from durable state alone —
// no in-memory dependency — so it is identical after a reload or a process death
// (H2/H3). The projection-vs-rebuild consistency check has already run inside
// RunController.load*, quietly repairing a disagreeing projection from the log.

import type { Clock } from '../model/index.js';
import type { RunController } from './machine.js';

export interface RecoverySnapshot {
  readonly runId: string;
  readonly classTitle: string;
  readonly classDate: string;
  /** Actual start (Begin Class), ISO 8601 with offset. */
  readonly actualStartIso: string;
  readonly actualStartEpochMs: number;
  /** The last active segment's display name, or null if none entered yet. */
  readonly lastSegmentName: string | null;
  readonly lastSegmentId: string | null;
  /** Side for a bilateral side-segment, else null. */
  readonly side: 'right' | 'left' | null;
  readonly savasanaStep: number;
  readonly savasanaStepCount: number;
  /** Current wall time when the recovery screen is composed, epoch ms. */
  readonly nowEpochMs: number;
}

/**
 * Build the recovery snapshot for a loaded active run. `clock` supplies the
 * current wall time for the screen (everything else is durable). The controller
 * has already loaded the exact revision the run began with and reconciled its
 * projection against the log.
 */
export function buildRecoverySnapshot(controller: RunController, clock: Clock): RecoverySnapshot {
  const def = controller.definition;
  const snap = controller.snapshot();
  const events = controller.eventLog();
  const started = events.find((e) => e.type === 'run_started');
  const actualStartEpochMs = started ? started.wallEpochMs : 0;
  const actualStartIso = started ? started.wall : '';

  return {
    runId: controller.runId,
    classTitle: def.title,
    classDate: def.date,
    actualStartIso,
    actualStartEpochMs,
    lastSegmentName: snap.currentSegment ? snap.currentSegment.name : null,
    lastSegmentId: snap.currentSegmentId,
    side: snap.side,
    savasanaStep: snap.savasanaStep,
    savasanaStepCount: snap.savasanaStepCount,
    nowEpochMs: clock.now().getTime(),
  };
}
