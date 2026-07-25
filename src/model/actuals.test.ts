import { describe, expect, it } from 'vitest';
import { importClass } from '../parser/index.js';
import { expectOk, readFixture } from '../parser/test-helpers.js';
import type { ClassDefinition } from '../schema/index.js';
import {
  currentDriftDisplay,
  currentSegmentId,
  deriveActuals,
  deriveSavasanaStep,
  deriveVisitDrifts,
  deriveVisits,
} from './actuals.js';
import { EventLog, jul28 } from './test-support.js';

async function desirePaths(): Promise<ClassDefinition> {
  return expectOk(await importClass(readFixture('valid-desire-paths.md'))).classDefinition;
}

const HARD_CLOSE = jul28(20, 0);

function begunLog(): EventLog {
  return new EventLog().runStarted(jul28(19, 0), {
    runLocalDate: '2026-07-28',
    hardCloseAtEpochMs: HARD_CLOSE,
  });
}

describe('visits — bounded by the next segment-changing event', () => {
  it('a trailing open visit (no finish) is not completed', () => {
    const events = begunLog()
      .entered('grounding', jul28(19, 0))
      .entered('supported-butterfly', jul28(19, 10))
      .all();
    const visits = deriveVisits(events);
    // Grounding is bounded by the second entry (10 min); supported-butterfly is open.
    expect(visits).toHaveLength(1);
    expect(visits[0]!.segmentId).toBe('grounding');
    expect(visits[0]!.durationSec).toBe(600);
  });

  it('run_finished bounds the final visit', () => {
    const events = begunLog()
      .entered('grounding', jul28(19, 0))
      .finished(jul28(19, 8))
      .all();
    const visits = deriveVisits(events);
    expect(visits).toHaveLength(1);
    expect(visits[0]!.durationSec).toBe(480);
  });
});

describe('H4 — back-visit duration is the sum of both bounded visits; status revisited', () => {
  it('A → B → back to A → forward: A actual is the sum; second A entry shows revisited', async () => {
    const def = await desirePaths();
    const t0 = jul28(19, 0);
    const events = new EventLog()
      .runStarted(t0, { runLocalDate: '2026-07-28', hardCloseAtEpochMs: HARD_CLOSE })
      .entered('supported-butterfly', t0) //            A visit 1 starts
      .entered('sleeping-swan--right', t0 + 100_000) //  A v1 bounded (100s); B starts
      .back('supported-butterfly', t0 + 150_000) //      (back marker)
      .entered('supported-butterfly', t0 + 150_000) //   B bounded (50s); A visit 2 starts
      .finished(t0 + 300_000) //                          A v2 bounded (150s)
      .all();

    const actuals = deriveActuals(def, events);
    const a = actuals.find((s) => s.id === 'supported-butterfly')!;
    expect(a.visits).toBe(2);
    expect(a.actualSec).toBe(250); // 100 + 150
    expect(a.status).toBe('revisited');

    const b = actuals.find((s) => s.id === 'sleeping-swan--right')!;
    expect(b.actualSec).toBe(50);
    expect(b.visits).toBe(1);

    // The second A visit's drift display is `revisited`; the first A visit is a real value.
    const drifts = deriveVisitDrifts(def, events, t0);
    const aEntries = drifts.filter((d) => d.segmentId === 'supported-butterfly');
    expect(aEntries).toHaveLength(2);
    expect(aEntries[0]!.revisited).toBe(false);
    expect(aEntries[1]!.revisited).toBe(true);
    expect(aEntries[1]!.drift!.text).toBe('revisited');
  });
});

describe('skipped and substituted precedence in derivation', () => {
  it('a skipped segment reports actual 0 and status skipped', async () => {
    const def = await desirePaths();
    const events = begunLog()
      .entered('grounding', jul28(19, 0))
      .skipped('supported-caterpillar', jul28(19, 30))
      .finished(jul28(19, 40))
      .all();
    const actuals = deriveActuals(def, events);
    const seg = actuals.find((s) => s.id === 'supported-caterpillar')!;
    expect(seg.status).toBe('skipped');
    expect(seg.actualSec).toBe(0);
  });

  it('a substituted segment carries the replacement name and status substituted', async () => {
    const def = await desirePaths();
    const events = begunLog()
      .substituted('saddle--right', 'Reclined figure four', jul28(19, 35))
      .finished(jul28(19, 40))
      .all();
    const actuals = deriveActuals(def, events);
    const seg = actuals.find((s) => s.id === 'saddle--right')!;
    expect(seg.status).toBe('substituted');
    expect(seg.substitutedWith).toBe('Reclined figure four');
  });

  it('on a COMPLETED run, a segment never entered derives skipped with actual 0 (Q5c)', async () => {
    const def = await desirePaths();
    // Only grounding is ever entered; the run then finishes. Nobody corrected
    // anything — the app knows the rest were not taught.
    const events = begunLog()
      .entered('grounding', jul28(19, 0))
      .finished(jul28(19, 10))
      .all();
    const actuals = deriveActuals(def, events);

    const grounding = actuals.find((s) => s.id === 'grounding')!;
    expect(grounding.visits).toBe(1);
    expect(grounding.status).toBe('on-plan'); // 10 min planned, 10 min taught

    const untaught = actuals.filter((s) => s.id !== 'grounding');
    expect(untaught.length).toBeGreaterThan(0);
    for (const seg of untaught) {
      expect(seg.visits, `${seg.id} visits`).toBe(0);
      expect(seg.actualSec, `${seg.id} actual`).toBe(0);
      expect(seg.status, `${seg.id} status`).toBe('skipped');
    }
    // No segment_skipped event was ever written: the status is purely derived.
    expect(events.some((e) => e.type === 'segment_skipped')).toBe(false);
  });

  it('entered but brief still derives short, never skipped (Q5c)', async () => {
    const def = await desirePaths();
    const events = begunLog()
      .entered('grounding', jul28(19, 0))
      .entered('supported-butterfly', jul28(19, 0, 8)) // grounding visited for 8 seconds
      .finished(jul28(19, 1))
      .all();
    const grounding = deriveActuals(def, events).find((s) => s.id === 'grounding')!;
    expect(grounding.visits).toBe(1);
    expect(grounding.actualSec).toBe(8);
    expect(grounding.status).toBe('short');
  });

  it('while a run is still ACTIVE, unvisited segments are not called skipped', async () => {
    const def = await desirePaths();
    const events = begunLog()
      .entered('grounding', jul28(19, 0))
      .entered('supported-butterfly', jul28(19, 10))
      .all(); // no finish: the class is still being taught
    const actuals = deriveActuals(def, events);
    expect(actuals.some((s) => s.status === 'skipped')).toBe(false);
  });

  it('every expanded segment gets exactly one summary, in plan order', async () => {
    const def = await desirePaths();
    const events = begunLog().entered('grounding', jul28(19, 0)).finished(jul28(19, 5)).all();
    const actuals = deriveActuals(def, events);
    expect(actuals.map((a) => a.id)).toEqual(def.expandedRuntimeSegments.map((s) => s.id));
  });
});

describe('current segment and drift', () => {
  it('currentSegmentId follows the last segment_entered', () => {
    const events = begunLog()
      .entered('grounding', jul28(19, 0))
      .entered('supported-butterfly', jul28(19, 10))
      .all();
    expect(currentSegmentId(events)).toBe('supported-butterfly');
  });

  it('currentDriftDisplay reports the current segment drift', async () => {
    const def = await desirePaths();
    const t0 = jul28(19, 0);
    // Enter supported-caterpillar (planned start 7:24) at 7:27 → +3 min.
    const events = new EventLog()
      .runStarted(t0, { runLocalDate: '2026-07-28', hardCloseAtEpochMs: HARD_CLOSE })
      .entered('supported-caterpillar', jul28(19, 27))
      .all();
    const d = currentDriftDisplay(def, events, t0)!;
    expect(d.text).toBe('+3 min');
  });

  it('presentation events do not break the revisited detection', async () => {
    const def = await desirePaths();
    const t0 = jul28(19, 0);
    const events = new EventLog()
      .runStarted(t0, { runLocalDate: '2026-07-28', hardCloseAtEpochMs: HARD_CLOSE })
      .entered('supported-butterfly', t0)
      .entered('sleeping-swan--right', t0 + 100_000)
      .back('supported-butterfly', t0 + 150_000)
      .referenceExpanded('supported-butterfly', t0 + 151_000) // presentation between back and entry
      .entered('supported-butterfly', t0 + 152_000)
      .all();
    const d = currentDriftDisplay(def, events, t0)!;
    expect(d.text).toBe('revisited');
  });
});

describe('D8 (model level) — passing a planned end changes no derived teaching state', () => {
  it('derivations depend only on events, never on the wall clock advancing', async () => {
    const def = await desirePaths();
    const t0 = jul28(19, 0);
    // Grounding planned 7:00–7:10; enter it and let real time pass its planned end
    // with NO further event. The current segment and visits are unchanged: nothing
    // in the model advances on time (there is no `now` input to these derivations).
    const events = new EventLog()
      .runStarted(t0, { runLocalDate: '2026-07-28', hardCloseAtEpochMs: HARD_CLOSE })
      .entered('grounding', t0)
      .all();
    expect(currentSegmentId(events)).toBe('grounding');
    expect(deriveVisits(events)).toHaveLength(0); // still open, not auto-closed at 7:10
    const grounding = deriveActuals(def, events).find((s) => s.id === 'grounding')!;
    expect(grounding.actualSec).toBe(0); // no bounding event yet
  });
});

describe('savasana step position from the log', () => {
  it('folds advance (+1) and back (−1) from 0', () => {
    const events = begunLog()
      .entered('savasana', jul28(19, 45))
      .savasanaAdvanced(jul28(19, 47))
      .savasanaAdvanced(jul28(19, 49))
      .savasanaBack(jul28(19, 50))
      .all();
    expect(deriveSavasanaStep(events, 6)).toBe(1);
  });

  it('clamps at the last step and never below zero', () => {
    const many = begunLog().entered('savasana', jul28(19, 45));
    for (let i = 0; i < 10; i++) many.savasanaAdvanced(jul28(19, 46 + i));
    expect(deriveSavasanaStep(many.all(), 6)).toBe(5);

    const under = new EventLog().savasanaBack(jul28(19, 45)).savasanaBack(jul28(19, 46)).all();
    expect(deriveSavasanaStep(under, 6)).toBe(0);
  });

  it('with no step events the position is the first step', () => {
    expect(deriveSavasanaStep(begunLog().entered('savasana', jul28(19, 45)).all(), 6)).toBe(0);
  });
});
