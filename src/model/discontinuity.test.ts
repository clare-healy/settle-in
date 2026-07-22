import { describe, expect, it } from 'vitest';
import { DISCONTINUITY_TOLERANCE_MS, detectDiscontinuity } from './discontinuity.js';
import { jul28, sampleAt } from './test-support.js';

describe('discontinuity detection (detection only)', () => {
  it('agreement within tolerance is not a discontinuity', () => {
    const prev = sampleAt(jul28(19, 0), 1000);
    // ~1s passes on both clocks, with a small (200 ms) disagreement from clamping.
    const curr = sampleAt(jul28(19, 0, 1), 2200);
    const r = detectDiscontinuity(prev, curr);
    expect(r.discontinuity).toBe(false);
    expect(r.reason).toBeNull();
  });

  it('a forward wall jump against steady monotonic is flagged as disagreement', () => {
    const prev = sampleAt(jul28(19, 0), 1000);
    // Wall jumps +1h; monotonic advanced only 1s.
    const curr = sampleAt(jul28(20, 0), 2000);
    const r = detectDiscontinuity(prev, curr);
    expect(r.discontinuity).toBe(true);
    expect(r.reason).toBe('disagreement');
    expect(r.wallDeltaMs).toBe(3_600_000);
    expect(r.monotonicDeltaMs).toBe(1000);
  });

  it('a backward wall movement is flagged as wall-backward', () => {
    const prev = sampleAt(jul28(19, 5), 5000);
    const curr = sampleAt(jul28(19, 0), 6000); // wall went back 5 minutes
    const r = detectDiscontinuity(prev, curr);
    expect(r.discontinuity).toBe(true);
    expect(r.reason).toBe('wall-backward');
    expect(r.wallDeltaMs).toBeLessThan(0);
  });

  it('disagreement exactly at tolerance is accepted; just beyond is flagged', () => {
    const prev = sampleAt(jul28(19, 0), 0);
    const atTol = sampleAt(jul28(19, 0) + 1000 + DISCONTINUITY_TOLERANCE_MS, 1000);
    expect(detectDiscontinuity(prev, atTol).discontinuity).toBe(false);
    const beyond = sampleAt(jul28(19, 0) + 1000 + DISCONTINUITY_TOLERANCE_MS + 1, 1000);
    expect(detectDiscontinuity(prev, beyond).discontinuity).toBe(true);
  });

  it('the tolerance constant is the documented 2 seconds', () => {
    expect(DISCONTINUITY_TOLERANCE_MS).toBe(2000);
  });
});
