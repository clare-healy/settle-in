// Durable record shapes for the on-device store.
//
// These mirror the persistence list in docs/implementation-treaty.md
// § Persistence model: original imported Markdown, normalized immutable class
// definitions, validation/schema-version metadata, run sessions and event
// histories, post-class notes, and local preferences. The ordered event log
// (the `events` store) is the single source of truth for a run; the projection
// fields on a run record are transactional projections of that log, written in
// the SAME transaction as the event they reflect and rebuildable from the log
// (equivalence is tested — see projections.ts and store.test.ts).

import type { ClassDefinition, RunEvent, RunStateKind, Side, Warning } from '../schema/index.js';

// --- Classes (immutable revisions) ------------------------------------------

/**
 * One immutable class revision. Identity is `sourceHash` (== ClassDefinition
 * revisionId): importing the same source_hash twice is idempotent, and the same
 * classId with a different sourceHash is a new revision (a separate record). The
 * store exposes no update path for these records — immutability is enforced by
 * API shape (put-if-absent only). `definition` already embeds the original
 * Markdown, so it is not stored a second time.
 */
export interface StoredClassRevision {
  /** Primary key. Equals `definition.revisionId`. */
  readonly sourceHash: string;
  /** Index: groups all revisions of one authored class. */
  readonly classId: string;
  /** Validation/schema metadata: the class-input schema version. */
  readonly schemaVersion: number;
  /** Validation metadata: warnings surfaced at import (never blocking). */
  readonly warnings: readonly Warning[];
  /** When this revision was first stored, ISO 8601 with offset. */
  readonly importedAt: string;
  /** The normalized, immutable definition (carries originalMarkdown). */
  readonly definition: ClassDefinition;
}

// --- Runs (sessions with transactional projections) -------------------------

/**
 * The event-derived projection cached on a run record for fast recovery. Every
 * field here is rebuildable from the event log via `rebuildProjections`; the
 * cache exists only so recovery does not have to replay before showing a calm
 * screen. It is never an independent record of truth.
 */
export interface RunProjection {
  /** Target of the last `segment_entered`, or null before the first entry. */
  readonly currentSegmentId: string | null;
  /** Folded savasana step index, clamped to [0, stepCount − 1]. */
  readonly savasanaStep: number;
  /** Segment whose reference is currently expanded, or null (minimal). */
  readonly expandedReferenceSegmentId: string | null;
  /** Wake-acknowledgment: has `wake_message_shown` been appended? */
  readonly wakeMessageShown: boolean;
}

/**
 * A run session. The lifecycle `status` is a top-level field managed by begin /
 * finish / abandon / finalize transitions; the event-derived `projection` is
 * written atomically with each event it reflects.
 */
export interface StoredRun {
  /** Primary key. */
  readonly runId: string;
  /** Index: the authored class this run taught. */
  readonly classId: string;
  /** The EXACT class revision used when the run began (immutability linkage). */
  readonly revisionSourceHash: string;
  /** Index: durable run state. Only `active_run` blocks a new begin (F7). */
  readonly status: RunStateKind;
  readonly runStartedAt: string;
  readonly runStartedAtEpochMs: number;
  readonly runLocalDate: string;
  /** Fixed hard close, constructed once at Begin and never recomputed. */
  readonly hardCloseAt: string;
  readonly hardCloseAtEpochMs: number;
  readonly projection: RunProjection;
  /** Last write instant for this record, ISO 8601 with offset. */
  readonly updatedAt: string;
}

// --- Events (the single source of truth) ------------------------------------

/**
 * A stored run event. The event log's ordering (`seq`) is authoritative; the
 * composite key [runId, seq] keeps a run's events contiguous and seq-ordered.
 */
export type StoredEvent = RunEvent & { readonly runId: string };

// --- Post-class notes (draft + final) ---------------------------------------

/**
 * Post-class notes for a run. `draft` accumulates while notes are being written;
 * `final` is set (and `finalizedAt` stamped) when Clare completes the run, which
 * also transitions the run to `completed_run`.
 */
export interface StoredNotes {
  /** Primary key: the run these notes belong to. */
  readonly runId: string;
  readonly draft: string;
  readonly final: string | null;
  readonly finalizedAt: string | null;
  readonly updatedAt: string;
}

// --- Preferences ------------------------------------------------------------

/** Local preferences are simple string-keyed values (relaxed durability is fine). */
export type PreferenceValue = string | number | boolean | null;

// --- Convenience re-exports for consumers -----------------------------------

export type { Side, RunStateKind };
