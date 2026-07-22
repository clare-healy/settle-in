// As-taught export — Export Schema v1 (docs/class-format.md § As-taught export).
//
// This is a TREATY. The front-matter field set, the H1 shape, the single
// `## Segments` yaml block in canonical expanded-plan order, the segment-row
// fields and status precedence, and the `## Room note` section are fixed by
// docs/class-format.md. If this file needs the schema to change, STOP and write a
// Y/N question in M5-QUESTIONS.md — a schema change ripples into
// docs/yin-flow-state-instructions.md and is the orchestrator's to make.
//
// The document is DERIVED entirely from the run's event history and post-class
// note. It is generated, never hand-edited, and re-exporting the same completed
// run always produces identical bytes: every value comes from the ordered event
// log via the model's deriveActuals plus the persisted run record, and the YAML
// is emitted by a small deterministic writer (never a library dump).

import type { ClassDefinition, RunEvent } from '../schema/index.js';
import { EXPORT_SCHEMA_VERSION } from '../schema/index.js';
import { deriveActuals, type SegmentActual } from '../model/index.js';

/** Everything the as-taught export needs, all durable and already persisted. */
export interface AsTaughtInputs {
  readonly definition: ClassDefinition;
  /** The exact class revision taught. */
  readonly revisionSourceHash: string;
  readonly runId: string;
  /** Local date at Begin (YYYY-MM-DD), from the run record. */
  readonly runLocalDate: string;
  /** ISO 8601 with offset; from the run's `run_started` event. */
  readonly runStartedAt: string;
  /** ISO 8601 with offset of the finishing event, or the empty string if none. */
  readonly runFinishedAt: string;
  /** Fixed hard close, ISO 8601 with offset; constructed once at Begin. */
  readonly hardCloseAt: string;
  /** The application version that produced this export. */
  readonly appVersion: string;
  /** The ordered event log for the run. */
  readonly events: readonly RunEvent[];
  /** Clare's verbatim room note, or null/empty for `None recorded.` */
  readonly roomNote: string | null;
}

/**
 * The finishing instant for the export's `run_finished_at`: the wall time of the
 * last `run_finished` (normal) or `run_abandoned` (early end) event, or the empty
 * string when the run has neither yet.
 */
export function finishInstant(events: readonly RunEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e && (e.type === 'run_finished' || e.type === 'run_abandoned')) return e.wall;
  }
  return '';
}

/**
 * Emit the as-taught Markdown record for one run. Deterministic: identical inputs
 * produce byte-identical output. Line endings are LF; the document ends with a
 * single trailing newline.
 */
export function exportAsTaught(inputs: AsTaughtInputs): string {
  const { definition } = inputs;
  const actuals = deriveActuals(definition, inputs.events);

  const frontMatter = [
    '---',
    `export_schema_version: ${EXPORT_SCHEMA_VERSION}`,
    'kind: as-taught-run',
    `class_id: ${scalar(definition.classId)}`,
    `class_title: ${scalar(definition.title)}`,
    `class_date: ${scalar(definition.date)}`,
    `revision_source_hash: ${quoted(inputs.revisionSourceHash)}`,
    `run_id: ${quoted(inputs.runId)}`,
    `run_local_date: ${scalar(inputs.runLocalDate)}`,
    `run_started_at: ${quoted(inputs.runStartedAt)}`,
    `run_finished_at: ${quoted(inputs.runFinishedAt)}`,
    `hard_close_at: ${quoted(inputs.hardCloseAt)}`,
    `app_version: ${quoted(inputs.appVersion)}`,
    '---',
  ];

  const heading = `# As Taught — ${definition.title} — ${inputs.runLocalDate}`;

  const segmentsBlock = [
    '## Segments',
    '',
    '```yaml',
    ...actuals.flatMap((row) => segmentLines(row)),
    '```',
  ];

  const note = (inputs.roomNote ?? '').trim();
  const roomNote = ['## Room note', '', note.length > 0 ? note : 'None recorded.'];

  const doc = [
    frontMatter.join('\n'),
    heading,
    segmentsBlock.join('\n'),
    roomNote.join('\n'),
  ].join('\n\n');

  return `${doc}\n`;
}

/**
 * One list entry per expanded runtime segment, in canonical expanded-plan order.
 * `side` appears only on bilateral side segments; `substituted_with` is a quoted
 * name or the literal `null`. Field order matches docs/class-format.md.
 */
function segmentLines(row: SegmentActual): string[] {
  const lines = [
    `- id: ${scalar(row.id)}`,
    `  parent_id: ${scalar(row.parentId)}`,
    `  type: ${row.type}`,
    `  name: ${scalar(row.name)}`,
  ];
  if (row.side) lines.push(`  side: ${row.side}`);
  lines.push(
    `  planned_sec: ${row.plannedSec}`,
    `  actual_sec: ${row.actualSec}`,
    `  status: ${row.status}`,
    `  visits: ${row.visits}`,
    `  substituted_with: ${row.substitutedWith === null ? 'null' : quoted(row.substitutedWith)}`,
  );
  return lines;
}

// --- Deterministic YAML scalar emission -------------------------------------
//
// The model's own ids/types/statuses are controlled, but authored display names
// and Clare's substitution text are free-form, so they are quoted whenever a bare
// scalar would be unsafe or ambiguous. Quoting is deterministic, so identical
// inputs always yield identical bytes.

/** A conservative "safe bare scalar" test: plain word/number-ish tokens only. */
const SAFE_BARE = /^[A-Za-z0-9][A-Za-z0-9 _.,'()/&–—-]*$/;

/** Reserved bare tokens YAML would read as non-strings — always quote these. */
const RESERVED = new Set([
  'null', 'Null', 'NULL', '~',
  'true', 'True', 'TRUE', 'false', 'False', 'FALSE',
  'yes', 'Yes', 'YES', 'no', 'No', 'NO',
  'on', 'On', 'ON', 'off', 'Off', 'OFF',
]);

/** Emit a string as a bare scalar when unambiguously safe, else double-quoted. */
function scalar(value: string): string {
  if (
    value.length > 0 &&
    value === value.trim() &&
    SAFE_BARE.test(value) &&
    !RESERVED.has(value)
  ) {
    return value;
  }
  return quoted(value);
}

/** Double-quote and escape a string for YAML (also valid JSON string escaping). */
function quoted(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
  return `"${escaped}"`;
}
