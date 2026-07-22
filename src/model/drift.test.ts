import { describe, expect, it } from 'vitest';
import { MINUS_SIGN, driftDisplay, driftDisplayFor } from './drift.js';
import { jul28 } from './test-support.js';

describe('D4 — drift on late entry is +N min and stable for the visit', () => {
  it('planned 7:15, entered 7:18 → +3 min', () => {
    const d = driftDisplayFor(jul28(19, 18), jul28(19, 15));
    expect(d.kind).toBe('behind');
    expect(d.text).toBe('+3 min');
    if (d.kind === 'behind') expect(d.minutes).toBe(3);
  });
});

describe('D5 — early entry rounds to −1 min with U+2212', () => {
  it('planned 7:15, entered 7:13:40 → −1 min', () => {
    const d = driftDisplayFor(jul28(19, 13, 40), jul28(19, 15));
    expect(d.kind).toBe('ahead');
    expect(d.text).toBe(`${MINUS_SIGN}1 min`);
    expect(d.text).toBe('−1 min');
    if (d.kind === 'ahead') expect(d.minutes).toBe(1);
  });
});

describe('D6 — on-plan threshold (29s in, 30s just outside)', () => {
  it('29 seconds late → on plan', () => {
    expect(driftDisplay(29_000).text).toBe('on plan');
    expect(driftDisplay(29_000).kind).toBe('on-plan');
  });
  it('29 seconds early → on plan', () => {
    expect(driftDisplay(-29_000).text).toBe('on plan');
  });
  it('exactly 29.999s → still on plan', () => {
    expect(driftDisplay(29_999).kind).toBe('on-plan');
    expect(driftDisplay(-29_999).kind).toBe('on-plan');
  });
  it('exactly 30s late → leaves on plan (a value shows)', () => {
    const d = driftDisplay(30_000);
    expect(d.kind).toBe('behind');
    expect(d.text).toBe('+1 min');
  });
  it('exactly 30s early → leaves on plan (a value shows)', () => {
    const d = driftDisplay(-30_000);
    expect(d.kind).toBe('ahead');
    expect(d.text).toBe(`${MINUS_SIGN}1 min`);
  });
});

describe('revisited display (Clare-ratified)', () => {
  it('a visit entered via back shows revisited instead of a value', () => {
    const d = driftDisplay(180_000, true);
    expect(d.kind).toBe('revisited');
    expect(d.text).toBe('revisited');
  });
  it('revisited overrides even a large drift', () => {
    const d = driftDisplayFor(jul28(19, 40), jul28(19, 15), true);
    expect(d.text).toBe('revisited');
  });
});

describe('discriminated display carries the raw drift too', () => {
  it('behind exposes driftSec and driftMs', () => {
    const d = driftDisplay(200_000);
    if (d.kind !== 'behind') throw new Error('expected behind');
    expect(d.driftMs).toBe(200_000);
    expect(d.driftSec).toBe(200);
  });
});
