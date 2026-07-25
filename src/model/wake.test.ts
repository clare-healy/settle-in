import { describe, expect, it } from 'vitest';
import {
  WAKE_LEAD_MS,
  deriveWakeState,
  deriveWakeStateFromLatch,
  wakeMessageAlreadyShown,
} from './wake.js';
import { EventLog, jul28 } from './test-support.js';

const HARD_CLOSE = jul28(20, 0);

/** In Savasana (the display half of the gate is satisfied). */
const IN_SAVASANA = true;
/** On Grounding, a pose, or a transition. */
const ELSEWHERE = false;

describe('E-logic — temporal eligibility is the clock half only', () => {
  it('7:57:59 is not yet eligible, even in savasana', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 57, 59), HARD_CLOSE, '20:00', false, IN_SAVASANA);
    expect(s.temporallyEligible).toBe(false);
    expect(s.wakeMessageVisible).toBe(false);
    expect(s.phase).toBe('before-window');
    expect(s.shouldAppendShownEvent).toBe(false);
  });

  it('7:58:00 exactly, in savasana, is visible and fades in once', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 58, 0), HARD_CLOSE, '20:00', false, IN_SAVASANA);
    expect(s.temporallyEligible).toBe(true);
    expect(s.wakeMessageVisible).toBe(true);
    expect(s.phase).toBe('wake-eligible');
    expect(s.fadeIn).toBe(true);
    expect(s.shouldAppendShownEvent).toBe(true);
    expect(s.atHardClose).toBe(false);
  });

  it('the lead time is exactly two minutes', () => {
    expect(WAKE_LEAD_MS).toBe(120_000);
    expect(HARD_CLOSE - WAKE_LEAD_MS).toBe(jul28(19, 58));
  });

  it('entering savasana after 7:58 finds the message immediately visible', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 59, 30), HARD_CLOSE, '20:00', false, IN_SAVASANA);
    expect(s.wakeMessageVisible).toBe(true);
    expect(s.fadeIn).toBe(true);
  });
});

describe('E3/Q5a — the segment gate: eligible but not in Savasana shows nothing', () => {
  it('7:58 on a pose is temporally eligible but NOT visible, and appends no event', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 58), HARD_CLOSE, '20:00', false, ELSEWHERE);
    expect(s.temporallyEligible).toBe(true);
    expect(s.wakeMessageVisible).toBe(false);
    expect(s.fadeIn).toBe(false);
    expect(s.shouldAppendShownEvent).toBe(false);
  });

  it('well past the hard close, still on a pose: nothing shows, nothing is written', () => {
    const s = deriveWakeStateFromLatch(jul28(20, 12), HARD_CLOSE, '20:00', false, ELSEWHERE);
    expect(s.wakeMessageVisible).toBe(false);
    expect(s.shouldAppendShownEvent).toBe(false);
  });

  it('advancing from that pose into Savasana shows it once', () => {
    const onPose = deriveWakeStateFromLatch(jul28(19, 59), HARD_CLOSE, '20:00', false, ELSEWHERE);
    expect(onPose.shouldAppendShownEvent).toBe(false);
    // Same instant, same (still empty) latch — only the segment changed.
    const inSavasana = deriveWakeStateFromLatch(jul28(19, 59), HARD_CLOSE, '20:00', false, IN_SAVASANA);
    expect(inSavasana.wakeMessageVisible).toBe(true);
    expect(inSavasana.fadeIn).toBe(true);
    expect(inSavasana.shouldAppendShownEvent).toBe(true);
  });
});

describe('E8 — a run begun at or after the hard close', () => {
  it('is temporally eligible from the first segment but shows nothing there', () => {
    const s = deriveWakeStateFromLatch(jul28(20, 15), HARD_CLOSE, '20:00', false, ELSEWHERE);
    expect(s.temporallyEligible).toBe(true);
    expect(s.wakeMessageVisible).toBe(false);
    expect(s.shouldAppendShownEvent).toBe(false);
    // The hard-close indicator is NOT gated on Savasana — it is present immediately.
    expect(s.atHardClose).toBe(true);
    expect(s.phase).toBe('hard-close');
    expect(s.hardCloseIndicator).toBe('8:00 · hard close');
  });

  it('shows the message immediately on entering Savasana, once', () => {
    const first = deriveWakeStateFromLatch(jul28(20, 15), HARD_CLOSE, '20:00', false, IN_SAVASANA);
    expect(first.wakeMessageVisible).toBe(true);
    expect(first.fadeIn).toBe(true);
    expect(first.shouldAppendShownEvent).toBe(true);
    // With the latch now durable, it stays present without a second write or fade.
    const after = deriveWakeStateFromLatch(jul28(20, 16), HARD_CLOSE, '20:00', true, IN_SAVASANA);
    expect(after.wakeMessageVisible).toBe(true);
    expect(after.fadeIn).toBe(false);
    expect(after.shouldAppendShownEvent).toBe(false);
  });
});

describe('E6 — durable fade-once latch derives from the event log', () => {
  it('once wake_message_shown is present, no replayed fade', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 59), HARD_CLOSE, '20:00', true, IN_SAVASANA);
    expect(s.alreadyShown).toBe(true);
    expect(s.fadeIn).toBe(false);
    expect(s.shouldAppendShownEvent).toBe(false);
    // The message is still present, just without a fade.
    expect(s.wakeMessageVisible).toBe(true);
  });

  it('wakeMessageAlreadyShown reads the latch from events', () => {
    const before = new EventLog().entered('savasana', jul28(19, 50)).all();
    expect(wakeMessageAlreadyShown(before)).toBe(false);
    const after = new EventLog().entered('savasana', jul28(19, 50)).wakeShown(jul28(19, 58)).all();
    expect(wakeMessageAlreadyShown(after)).toBe(true);
  });

  it('deriveWakeState replaying the same log never re-fades', () => {
    const events = new EventLog().entered('savasana', jul28(19, 50)).wakeShown(jul28(19, 58)).all();
    const s = deriveWakeState(jul28(19, 59), HARD_CLOSE, '20:00', events, IN_SAVASANA);
    expect(s.fadeIn).toBe(false);
    expect(s.wakeMessageVisible).toBe(true);
  });

  it('deriveWakeState outside Savasana is invisible whatever the latch says', () => {
    const events = new EventLog().entered('supported-butterfly', jul28(19, 50)).all();
    const s = deriveWakeState(jul28(19, 59), HARD_CLOSE, '20:00', events, ELSEWHERE);
    expect(s.wakeMessageVisible).toBe(false);
    expect(s.shouldAppendShownEvent).toBe(false);
  });
});

describe('D9 — hard-close indicator, no negative countdown, never Savasana-gated', () => {
  it('at 8:00 exactly the indicator reads "8:00 · hard close"', () => {
    const s = deriveWakeStateFromLatch(jul28(20, 0), HARD_CLOSE, '20:00', true, IN_SAVASANA);
    expect(s.atHardClose).toBe(true);
    expect(s.hardCloseIndicator).toBe('8:00 · hard close');
  });

  it('a few minutes past 8:00 still reads "8:00 · hard close" (no negative time)', () => {
    const s = deriveWakeStateFromLatch(jul28(20, 4), HARD_CLOSE, '20:00', true, IN_SAVASANA);
    expect(s.hardCloseIndicator).toBe('8:00 · hard close');
    // The state carries no countdown to go negative.
    expect(s.phase).toBe('hard-close');
  });

  it('the indicator is identical on a pose — the segment gate governs the message only', () => {
    const onPose = deriveWakeStateFromLatch(jul28(20, 4), HARD_CLOSE, '20:00', false, ELSEWHERE);
    expect(onPose.hardCloseIndicator).toBe('8:00 · hard close');
    expect(onPose.atHardClose).toBe(true);
    expect(onPose.phase).toBe('hard-close');
    expect(onPose.wakeMessageVisible).toBe(false);
  });

  it('before hard close there is no hard-close indicator', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 58), HARD_CLOSE, '20:00', false, IN_SAVASANA);
    expect(s.hardCloseIndicator).toBeNull();
  });
});
