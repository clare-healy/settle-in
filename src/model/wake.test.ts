import { describe, expect, it } from 'vitest';
import {
  WAKE_LEAD_MS,
  deriveWakeState,
  deriveWakeStateFromLatch,
  wakeMessageAlreadyShown,
} from './wake.js';
import { EventLog, jul28 } from './test-support.js';

const HARD_CLOSE = jul28(20, 0);

describe('E-logic — eligibility timing', () => {
  it('7:57:59 is not yet eligible', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 57, 59), HARD_CLOSE, '20:00', false);
    expect(s.wakeMessageVisible).toBe(false);
    expect(s.phase).toBe('before-window');
    expect(s.shouldAppendShownEvent).toBe(false);
  });

  it('7:58:00 exactly is eligible and fades in once', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 58, 0), HARD_CLOSE, '20:00', false);
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

  it('entering savasana after 7:58 finds the message already eligible', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 59, 30), HARD_CLOSE, '20:00', false);
    expect(s.wakeMessageVisible).toBe(true);
    expect(s.fadeIn).toBe(true);
  });

  it('a run begun after hard close is immediately eligible and at hard close', () => {
    const s = deriveWakeStateFromLatch(jul28(20, 15), HARD_CLOSE, '20:00', false);
    expect(s.wakeMessageVisible).toBe(true);
    expect(s.atHardClose).toBe(true);
    expect(s.phase).toBe('hard-close');
  });
});

describe('E6 — durable fade-once latch derives from the event log', () => {
  it('once wake_message_shown is present, no replayed fade', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 59), HARD_CLOSE, '20:00', true);
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
    const s = deriveWakeState(jul28(19, 59), HARD_CLOSE, '20:00', events);
    expect(s.fadeIn).toBe(false);
    expect(s.wakeMessageVisible).toBe(true);
  });
});

describe('D9 — hard-close indicator, no negative countdown', () => {
  it('at 8:00 exactly the indicator reads "8:00 · hard close"', () => {
    const s = deriveWakeStateFromLatch(jul28(20, 0), HARD_CLOSE, '20:00', true);
    expect(s.atHardClose).toBe(true);
    expect(s.hardCloseIndicator).toBe('8:00 · hard close');
  });

  it('a few minutes past 8:00 still reads "8:00 · hard close" (no negative time)', () => {
    const s = deriveWakeStateFromLatch(jul28(20, 4), HARD_CLOSE, '20:00', true);
    expect(s.hardCloseIndicator).toBe('8:00 · hard close');
    // The state carries no countdown to go negative.
    expect(s.phase).toBe('hard-close');
  });

  it('before hard close there is no hard-close indicator', () => {
    const s = deriveWakeStateFromLatch(jul28(19, 58), HARD_CLOSE, '20:00', false);
    expect(s.hardCloseIndicator).toBeNull();
  });
});
