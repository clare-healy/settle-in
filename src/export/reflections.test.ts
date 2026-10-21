import { describe, expect, it } from 'vitest';
import type { StoredClassRevision, StoredNotes, StoredRun } from '../store/index.js';
import { exportReflectionCorpus } from './reflections.js';
import { loadValidClass, revisionOf } from '../store/test-support.js';

describe('reflection corpus export', () => {
  it('exports final reflections chronologically with their class and run context', async () => {
    const revision = revisionOf(await loadValidClass());
    const later = run(revision, 'run-later', 2000, '2026-08-04');
    const earlier = run(revision, 'run-earlier', 1000, '2026-07-28');
    const notes: StoredNotes[] = [
      note('run-later', 'Second reflection'),
      note('run-earlier', 'First reflection'),
    ];

    const out = exportReflectionCorpus({
      revisions: [revision],
      runs: [later, earlier],
      notes,
      exportedAt: '2026-10-20T12:00:00-05:00',
    });

    expect(out).toContain('Reflections: 2');
    expect(out.indexOf('First reflection')).toBeLessThan(out.indexOf('Second reflection'));
    expect(out).toContain(`## 2026-07-28 — ${revision.definition.title}`);
    expect(out).toContain('- Note state: final');
  });

  it('includes a non-empty saved draft and safely fences embedded backticks', async () => {
    const revision = revisionOf(await loadValidClass());
    const savedRun = run(revision, 'run-draft', 1000, '2026-07-28');
    const out = exportReflectionCorpus({
      revisions: [revision],
      runs: [savedRun],
      notes: [{ ...note('run-draft', null), draft: 'A draft with ``` inside.' }],
      exportedAt: '2026-10-20T12:00:00-05:00',
    });
    expect(out).toContain('- Note state: saved draft');
    expect(out).toContain('````text');
  });
});

function note(runId: string, final: string | null): StoredNotes {
  return {
    runId,
    draft: final ?? '',
    final,
    finalizedAt: final ? '2026-07-28T20:05:00-05:00' : null,
    updatedAt: '2026-07-28T20:05:00-05:00',
  };
}

function run(revision: StoredClassRevision, runId: string, epochMs: number, runLocalDate: string): StoredRun {
  return {
    runId,
    classId: revision.classId,
    revisionSourceHash: revision.sourceHash,
    status: 'completed_run',
    runStartedAt: '2026-07-28T19:00:00-05:00',
    runStartedAtEpochMs: epochMs,
    runLocalDate,
    hardCloseAt: '2026-07-28T20:00:00-05:00',
    hardCloseAtEpochMs: epochMs + 60 * 60_000,
    projection: {
      currentSegmentId: 'savasana',
      savasanaStep: 0,
      expandedReferenceSegmentId: null,
      wakeMessageShown: false,
    },
    updatedAt: '2026-07-28T20:05:00-05:00',
  };
}
