// Human-readable reflection-corpus export.
//
// The whole-library JSON backup remains the lossless restore artifact. This
// Markdown export is the analysis artifact: every non-empty saved reflection,
// joined to its exact class revision and taught run, in chronological order.

import type { StoredClassRevision, StoredNotes, StoredRun } from '../store/index.js';

export interface ReflectionCorpusInputs {
  readonly revisions: readonly StoredClassRevision[];
  readonly runs: readonly StoredRun[];
  readonly notes: readonly StoredNotes[];
  readonly exportedAt: string;
}

interface ReflectionEntry {
  readonly run: StoredRun;
  readonly revision: StoredClassRevision;
  readonly text: string;
  readonly isDraft: boolean;
}

/** Export every non-empty final reflection, plus any still-saved non-empty draft. */
export function exportReflectionCorpus(inputs: ReflectionCorpusInputs): string {
  const revisions = new Map(inputs.revisions.map((revision) => [revision.sourceHash, revision]));
  const runs = new Map(inputs.runs.map((run) => [run.runId, run]));

  const entries: ReflectionEntry[] = [];
  for (const note of inputs.notes) {
    const run = runs.get(note.runId);
    if (!run) continue;
    const revision = revisions.get(run.revisionSourceHash);
    if (!revision) continue;
    const final = note.final ?? '';
    const draft = note.draft;
    if (final.trim()) entries.push({ run, revision, text: final, isDraft: false });
    else if (draft.trim()) entries.push({ run, revision, text: draft, isDraft: true });
  }

  entries.sort((a, b) => a.run.runStartedAtEpochMs - b.run.runStartedAtEpochMs);

  const lines = [
    '# Settle In — Reflection Corpus',
    '',
    `Exported: ${inputs.exportedAt}`,
    `Reflections: ${entries.length}`,
    '',
    'This file contains teaching reflections only. Class plans and segment timing remain in the as-taught exports and library backup.',
  ];

  if (entries.length === 0) {
    lines.push('', 'No reflections recorded.');
    return `${lines.join('\n')}\n`;
  }

  for (const entry of entries) {
    const def = entry.revision.definition;
    lines.push(
      '',
      `## ${entry.run.runLocalDate} — ${def.title}`,
      '',
      `- Run ID: ${entry.run.runId}`,
      `- Authored class date: ${def.date}`,
      `- Started: ${entry.run.runStartedAt}`,
      `- Note state: ${entry.isDraft ? 'saved draft' : 'final'}`,
      '',
      '### Reflection (verbatim)',
      '',
      fencedText(entry.text),
    );
  }

  return `${lines.join('\n')}\n`;
}

function fencedText(text: string): string {
  const longestRun = Math.max(0, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length));
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}
