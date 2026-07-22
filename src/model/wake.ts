// Wake-message eligibility and the hard-close indicator.
//
// The wake message becomes eligible at exactly two minutes before hard_close_at
// (normally 7:58 PM) while a run is active, and remains visible until Clare
// advances or finishes. Its "shown once" latch derives from the persisted
// `wake_message_shown` event, not from memory, so a reload after 7:58 recovers
// with the message simply present — no replayed fade. At/after hard close the
// quiet indicator reads `8:00 · hard close`, never a negative countdown
// (docs/implementation-treaty.md § Hard close and savasana signal).

import type { RunEvent } from '../schema/index.js';
import { format12hLabel } from './time.js';

/** Lead time before the hard close at which the wake message becomes eligible. */
export const WAKE_LEAD_MS = 120_000;

/** Middle dot (U+00B7) used in the hard-close indicator. */
const MIDDOT = '·';

export type WakePhase = 'before-window' | 'wake-eligible' | 'hard-close';

export interface WakeState {
  readonly phase: WakePhase;
  /** True once now ≥ hard_close_at − 120s: the message should be on screen. */
  readonly wakeMessageVisible: boolean;
  /** Derived from a persisted `wake_message_shown` event. */
  readonly alreadyShown: boolean;
  /**
   * True only when the message is becoming visible for the first time (visible and
   * not already shown): animate the one ~3s fade. On recovery (alreadyShown) the
   * message is present without a replayed fade.
   */
  readonly fadeIn: boolean;
  /**
   * True when a `wake_message_shown` event should be appended before first render.
   * The caller also gates this on the run being active.
   */
  readonly shouldAppendShownEvent: boolean;
  /** True once now ≥ hard_close_at. */
  readonly atHardClose: boolean;
  /** The `8:00 · hard close` indicator when at/after the hard close, else null. */
  readonly hardCloseIndicator: string | null;
}

/** The "shown once" latch: does the event log already contain `wake_message_shown`? */
export function wakeMessageAlreadyShown(events: readonly RunEvent[]): boolean {
  return events.some((e) => e.type === 'wake_message_shown');
}

/**
 * Derive the wake state purely from time and the latch.
 *
 * @param nowEpochMs          current wall instant
 * @param hardCloseAtEpochMs  the fixed hard close (persisted, never recomputed)
 * @param hardCloseLocal      class `hard_close_local` (e.g. "20:00") for the indicator label
 * @param alreadyShown        whether `wake_message_shown` is already in the log
 */
export function deriveWakeStateFromLatch(
  nowEpochMs: number,
  hardCloseAtEpochMs: number,
  hardCloseLocal: string,
  alreadyShown: boolean,
): WakeState {
  const atHardClose = nowEpochMs >= hardCloseAtEpochMs;
  const wakeMessageVisible = nowEpochMs >= hardCloseAtEpochMs - WAKE_LEAD_MS;
  const phase: WakePhase = atHardClose
    ? 'hard-close'
    : wakeMessageVisible
      ? 'wake-eligible'
      : 'before-window';
  return {
    phase,
    wakeMessageVisible,
    alreadyShown,
    fadeIn: wakeMessageVisible && !alreadyShown,
    shouldAppendShownEvent: wakeMessageVisible && !alreadyShown,
    atHardClose,
    hardCloseIndicator: atHardClose ? `${format12hLabel(hardCloseLocal)} ${MIDDOT} hard close` : null,
  };
}

/** Derive the wake state, reading the "shown once" latch from the event log. */
export function deriveWakeState(
  nowEpochMs: number,
  hardCloseAtEpochMs: number,
  hardCloseLocal: string,
  events: readonly RunEvent[],
): WakeState {
  return deriveWakeStateFromLatch(
    nowEpochMs,
    hardCloseAtEpochMs,
    hardCloseLocal,
    wakeMessageAlreadyShown(events),
  );
}
