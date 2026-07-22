// Pure library derivations: grouping revisions into authored classes, counting
// taught runs, and choosing the upcoming class.
//
// screen-states.md § 3: the earliest FUTURE class is suggested, and when more than
// one future class exists Clare explicitly chooses which is upcoming (the deferred
// M4a Q3). § 13: the library lists authored classes by date with a taught-run
// count and an upcoming marker. These are pure functions of the stored revisions
// and runs so the selection logic is unit-testable without the DOM or the clock.

import type { StoredClassRevision, StoredRun } from '../store/index.js';
import type { ClassDefinition } from '../schema/index.js';

/** One authored class: its revisions (a class is immutable per revision) and runs. */
export interface ClassGroup {
  readonly classId: string;
  /** The most-recently-imported revision — the plan shown and rerun by default. */
  readonly latest: StoredClassRevision;
  /** All revisions of this class, oldest import first. */
  readonly revisions: readonly StoredClassRevision[];
  /** Number of taught runs recorded for this class (every run that began). */
  readonly runCount: number;
  /** Convenience: the class date of the latest revision (YYYY-MM-DD). */
  readonly date: string;
}

/** The most-recently-imported revision in a set (ISO `importedAt` descending). */
export function latestRevision(revisions: readonly StoredClassRevision[]): StoredClassRevision | null {
  if (revisions.length === 0) return null;
  return [...revisions].sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0] ?? null;
}

/**
 * Group revisions into authored classes and attach taught-run counts, sorted by
 * class date ascending (then classId for stability). A run belongs to a class by
 * `classId`.
 */
export function groupClasses(
  revisions: readonly StoredClassRevision[],
  runs: readonly StoredRun[],
): ClassGroup[] {
  const byClass = new Map<string, StoredClassRevision[]>();
  for (const r of revisions) {
    const list = byClass.get(r.classId) ?? [];
    list.push(r);
    byClass.set(r.classId, list);
  }
  const runCounts = new Map<string, number>();
  for (const run of runs) {
    runCounts.set(run.classId, (runCounts.get(run.classId) ?? 0) + 1);
  }

  const groups: ClassGroup[] = [];
  for (const [classId, list] of byClass) {
    const ordered = [...list].sort((a, b) => a.importedAt.localeCompare(b.importedAt));
    const latest = latestRevision(list)!;
    groups.push({
      classId,
      latest,
      revisions: ordered,
      runCount: runCounts.get(classId) ?? 0,
      date: latest.definition.date,
    });
  }
  groups.sort((a, b) => a.date.localeCompare(b.date) || a.classId.localeCompare(b.classId));
  return groups;
}

/**
 * Choose the upcoming class id. An explicit `chosenClassId` wins when it still
 * resolves to a class. Otherwise the earliest class whose date is today or later is
 * suggested; if none is in the future, the most recent class is used so Home always
 * has something to open. Returns null for an empty library.
 */
export function pickUpcomingClassId(
  groups: readonly ClassGroup[],
  chosenClassId: string | null,
  todayLocalDate: string,
): string | null {
  if (groups.length === 0) return null;
  if (chosenClassId && groups.some((g) => g.classId === chosenClassId)) return chosenClassId;
  const future = groups.find((g) => g.date >= todayLocalDate);
  const chosen = future ?? groups[groups.length - 1];
  return chosen ? chosen.classId : null;
}

/** True when Clare must be asked to choose (more than one class dated today or later). */
export function upcomingChoiceIsAmbiguous(
  groups: readonly ClassGroup[],
  todayLocalDate: string,
): boolean {
  return groups.filter((g) => g.date >= todayLocalDate).length > 1;
}

/** The definition to run/preview for a class id (its latest revision), or null. */
export function upcomingDefinition(
  groups: readonly ClassGroup[],
  classId: string | null,
): ClassDefinition | null {
  if (!classId) return null;
  const group = groups.find((g) => g.classId === classId);
  return group ? group.latest.definition : null;
}

/** The display name of a class's peak pose (falls back to the raw id if unresolved). */
export function peakPoseName(def: ClassDefinition): string {
  const pose = def.authoredSegments.find((s) => s.type === 'pose' && s.id === def.peakPoseId);
  return pose ? pose.name : def.peakPoseId;
}
