import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ImportResult } from '../schema/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, '..', '..', 'fixtures');

export function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

export function expectOk(result: ImportResult): Extract<ImportResult, { ok: true }> {
  if (!result.ok) {
    throw new Error(`Expected import to succeed but it failed:\n${result.errors.map((e) => `- ${e.message}`).join('\n')}`);
  }
  return result;
}

export function expectFail(result: ImportResult): Extract<ImportResult, { ok: false }> {
  if (result.ok) {
    throw new Error('Expected import to fail but it succeeded.');
  }
  return result;
}

/** Case-insensitive "contains all of these substrings" check. */
export function messageMentions(message: string, ...needles: string[]): boolean {
  const lower = message.toLowerCase();
  return needles.every((n) => lower.includes(n.toLowerCase()));
}

export function hashOf(result: ImportResult): string {
  return result.ok ? result.classDefinition.sourceHash : (result.sourceHash ?? '');
}

const FENCE = '```';

/**
 * A minimal, fully valid Tuesday 60-minute class (10 + 34 + 1 + 15) that imports
 * with no warnings. Tests perturb it to exercise one gate at a time.
 */
export const MINIMAL_VALID: string = [
  '---',
  'schema_version: 1',
  'class_id: safety-test',
  'title: Safety Test',
  'date: 2026-07-28',
  'scheduled_start_local: "19:00"',
  'hard_close_local: "20:00"',
  'theme_line: A theme line.',
  'felt_sense: A felt sense.',
  'peak_pose_id: test-pose',
  'props:',
  '  - 1 bolster per person',
  'room_setup: []',
  'arrival: Arrive on the back.',
  'breathwork: Natural breath.',
  '---',
  '',
  '# Safety Test',
  '',
  '## Grounding',
  '',
  `${FENCE}yaml`,
  'id: grounding',
  'duration_min: 10',
  'theme_anchor: A grounding anchor.',
  'yin_principles:',
  '  - One.',
  '  - Two.',
  '  - Three.',
  'guided_silent_ratio: Brief guidance, then silence.',
  FENCE,
  '',
  '## Pose: Test Pose',
  '',
  `${FENCE}yaml`,
  'id: test-pose',
  'bilateral: false',
  'duration_min: 34',
  'entry: Enter the shape.',
  'target: A target.',
  'settling: Settle without force.',
  'midpoint: Notice the breath.',
  'props: Use a bolster.',
  'alternative: Rest on the back.',
  'exit: Leave slowly.',
  'notes: Notes here.',
  FENCE,
  '',
  '## Transition: To Savasana',
  '',
  `${FENCE}yaml`,
  'id: transition-to-savasana',
  'duration_min: 1',
  'next_segment_id: savasana',
  'setup: Return to the back.',
  'alternative_offer: Rest with knees bent.',
  FENCE,
  '',
  '## Savasana',
  '',
  `${FENCE}yaml`,
  'id: savasana',
  'duration_min: 15',
  'steps:',
  '  - Settle',
  '  - Body scan',
  '  - Breath softens',
  '  - Stillness',
  '  - Return of breath',
  '  - Gentle awakening',
  'wake_message: Two minutes. Time to begin the gentle awakening.',
  FENCE,
  '',
].join('\n');

/** Replace the first occurrence of a marker line's value; throws if absent. */
export function replaceOnce(source: string, find: string, replacement: string): string {
  if (!source.includes(find)) throw new Error(`test setup: "${find}" not found in source`);
  return source.replace(find, replacement);
}

