// Shared helpers for the M3 store and run tests. Not a *.test.ts file, so Vitest
// does not collect it as a suite. Importing this module installs fake-indexeddb's
// globals (build plan: persistence is unit-tested with fake-indexeddb; real
// Chromium verification lands at M6/M7).

import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { importClass } from '../parser/index.js';
import type { ClassDefinition } from '../schema/index.js';
import { TestClock } from '../model/index.js';
import { Store } from './store.js';
import type { StoredClassRevision } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, '..', '..', 'fixtures');

let dbCounter = 0;

/** A unique database name for full test isolation. */
export function newDbName(): string {
  dbCounter += 1;
  return `settle-in-test-${dbCounter}-${Date.now()}`;
}

/** Open a store over a specific database name (a second connection = a fresh transaction path). */
export function openStore(name: string): Promise<Store> {
  return Store.open({ name });
}

/** A store over a fresh, uniquely named fake-indexeddb database (full isolation). */
export function freshStore(): Promise<Store> {
  return Store.open({ name: newDbName() });
}

/** Import the canonical valid fixture into a ClassDefinition (bilateral poses, savasana). */
export async function loadValidClass(): Promise<ClassDefinition> {
  const source = readFileSync(join(fixturesDir, 'valid-desire-paths.md'), 'utf8');
  const result = await importClass(source);
  if (!result.ok) throw new Error(`fixture failed to import: ${result.errors.map((e) => e.message).join(', ')}`);
  return result.classDefinition;
}

/** Import a variant source string into a ClassDefinition. */
export async function classFromSource(source: string): Promise<ClassDefinition> {
  const result = await importClass(source);
  if (!result.ok) throw new Error(`source failed to import: ${result.errors.map((e) => e.message).join(', ')}`);
  return result.classDefinition;
}

/** Wrap a ClassDefinition as a StoredClassRevision for putClassRevision. */
export function revisionOf(def: ClassDefinition, importedAt = '2026-07-28T18:55:00-05:00'): StoredClassRevision {
  return {
    sourceHash: def.sourceHash,
    classId: def.classId,
    schemaVersion: def.schemaVersion,
    warnings: [],
    importedAt,
    definition: def,
  };
}

/** CDT offset used across the M2/M3 tests. */
export const CDT_OFFSET_MIN = -300;

/** Epoch ms for a 2026-07-28 (Tuesday) local wall time in CDT. */
export function jul28(h: number, mi: number, s = 0): number {
  return Date.UTC(2026, 6, 28, h, mi, s) - CDT_OFFSET_MIN * 60_000;
}

/** A TestClock plus the RunClockEnv fields the controller needs. */
export function makeEnv(opts?: {
  wallEpochMs?: number;
  executionId?: string;
  offsetMinutes?: number;
}): { clock: TestClock; env: { clock: TestClock; offsetMinutes: number; executionId: string } } {
  const clock = new TestClock({
    wallEpochMs: opts?.wallEpochMs ?? jul28(19, 0),
    monotonic: 0,
    offsetMinutes: opts?.offsetMinutes ?? CDT_OFFSET_MIN,
    executionId: opts?.executionId ?? 'exec-1',
  });
  return { clock, env: { clock, offsetMinutes: clock.offsetMinutes, executionId: clock.executionId } };
}
