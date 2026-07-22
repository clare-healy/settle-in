// The run state machine — pure orchestration over the store and the timing model.
//
// No DOM, no timers, no service worker: time enters through an injected Clock and
// a RunClockEnv (offset + execution identity). Every teaching-state action
// appends an event, computes the transactional projection from the log, persists
// event + projection in one strict transaction, and returns ONLY after the write
// is durable (persist-before-acknowledge, H1). Actions are serialized by a
// single-flight guard (F9). Durations, statuses, savasana step, and recovery
// state are always DERIVED from the event log via src/model and src/store —
// never stored as an independent record (docs/implementation-treaty.md § Run
// state model, § Recovery treaty).

import type {
  AuthoredSavasana,
  ClassDefinition,
  EventSample,
  ExpandedSegment,
  RunEvent,
  RunStateKind,
  Side,
} from '../schema/index.js';
import { constructHardClose, localDateAt, sampleFrom, type Clock } from '../model/index.js';
import { projectionsEqual, rebuildProjections, Store, type StoredRun } from '../store/index.js';

/** The clock environment for one execution: the clock plus the ambient offset and identity. */
export interface RunClockEnv {
  readonly clock: Clock;
  /** Zone offset in effect, minutes east of UTC. Captured at Begin / re-read at load. */
  readonly offsetMinutes: number;
  /** Identity of this JS execution; changes across reload and process death. */
  readonly executionId: string;
}

/** A calm read-model of the run, returned by every successful action. */
export interface RunSnapshot {
  readonly runId: string;
  readonly classId: string;
  readonly status: RunStateKind;
  readonly currentSegmentId: string | null;
  readonly currentSegment: ExpandedSegment | null;
  readonly side: Side | null;
  readonly savasanaStep: number;
  readonly savasanaStepCount: number;
  readonly expandedReferenceSegmentId: string | null;
  readonly wakeMessageShown: boolean;
}

export type ActionResult =
  | { readonly ok: true; readonly snapshot: RunSnapshot }
  | { readonly ok: false; readonly rejected: 'busy' | 'invalid'; readonly reason?: string };

export type BeginResult =
  | { readonly ok: true; readonly controller: RunController }
  | { readonly ok: false; readonly reason: 'active-run-exists' };

/** How the single-flight queue treats a second action arriving while one is pending. */
export const QUEUE_POLICY = 'reject-while-pending' as const;

function savasanaStepCountOf(def: ClassDefinition): number {
  const sav = def.authoredSegments.find((s): s is AuthoredSavasana => s.type === 'savasana');
  return sav ? sav.steps.length : 0;
}

/**
 * One active run's controller. Constructed by `begin` (a fresh run) or `load` /
 * `loadActive` (recovery). Holds the class revision, the run record, and the
 * in-memory event log — but the store is the source of truth; the in-memory log
 * is only committed after each durable write.
 */
export class RunController {
  private pending = false;

  private constructor(
    private readonly store: Store,
    private env: RunClockEnv,
    private readonly def: ClassDefinition,
    private run: StoredRun,
    private events: RunEvent[],
    private readonly stepCount: number,
  ) {}

  // --- Construction ---------------------------------------------------------

  /**
   * Begin a fresh run. Captures the re-anchor origin and constructs the fixed
   * hard close exactly once, both persisted with `run_started`. Enters the first
   * expanded segment (grounding) so the run opens in a teaching segment. The
   * single-active-run guard runs inside the store's begin transaction (F7).
   */
  static async begin(
    store: Store,
    env: RunClockEnv,
    def: ClassDefinition,
    options: { runId?: string } = {},
  ): Promise<BeginResult> {
    const runId = options.runId ?? generateId('run');
    const stepCount = savasanaStepCountOf(def);
    const first = def.expandedRuntimeSegments[0];

    const startSample = sampleFrom(env.clock, env.offsetMinutes, env.executionId);
    const runLocalDate = localDateAt(startSample.wallEpochMs, env.offsetMinutes);
    const hardClose = constructHardClose(startSample.wallEpochMs, env.offsetMinutes, def.hardCloseLocal);

    const runStarted: RunEvent = {
      seq: 0,
      type: 'run_started',
      wall: startSample.wall,
      wallEpochMs: startSample.wallEpochMs,
      monotonic: startSample.monotonic,
      executionId: startSample.executionId,
      runId,
      classId: def.classId,
      revisionSourceHash: def.sourceHash,
      runStartedAt: startSample.wall,
      runStartedAtEpochMs: startSample.wallEpochMs,
      runLocalDate,
      offsetMinutesAtBegin: env.offsetMinutes,
      hardCloseAt: hardClose.iso,
      hardCloseAtEpochMs: hardClose.epochMs,
    };

    const startEvents: RunEvent[] = [runStarted];
    if (first) {
      startEvents.push({
        seq: 1,
        type: 'segment_entered',
        wall: startSample.wall,
        wallEpochMs: startSample.wallEpochMs,
        monotonic: startSample.monotonic,
        executionId: startSample.executionId,
        segmentId: first.id,
      });
    }

    const projection = rebuildProjections(startEvents, stepCount);
    const runRecord: StoredRun = {
      runId,
      classId: def.classId,
      revisionSourceHash: def.sourceHash,
      status: 'active_run',
      runStartedAt: startSample.wall,
      runStartedAtEpochMs: startSample.wallEpochMs,
      runLocalDate,
      hardCloseAt: hardClose.iso,
      hardCloseAtEpochMs: hardClose.epochMs,
      projection,
      updatedAt: startSample.wall,
    };

    const result = await store.beginRun(runRecord, startEvents);
    if (!result.ok) return { ok: false, reason: result.reason };
    return {
      ok: true,
      controller: new RunController(store, env, def, runRecord, startEvents, stepCount),
    };
  }

  /**
   * Load the single active run from durable state alone (recovery). Returns null
   * when there is no unresolved active run. The class revision is loaded by the
   * run's exact `revisionSourceHash`, enforcing that recovery uses the same
   * revision the run began with. A projection-vs-rebuild consistency check runs
   * here: on disagreement the event log wins and the projection is quietly
   * repaired (H2/H3 groundwork).
   */
  static async loadActive(store: Store, env: RunClockEnv): Promise<RunController | null> {
    const run = await store.getActiveRun();
    if (!run) return null;
    return RunController.fromRun(store, env, run);
  }

  /** Load a specific run by id for recovery (same consistency check as loadActive). */
  static async load(store: Store, env: RunClockEnv, runId: string): Promise<RunController | null> {
    const run = await store.getRun(runId);
    if (!run) return null;
    return RunController.fromRun(store, env, run);
  }

  private static async fromRun(store: Store, env: RunClockEnv, run: StoredRun): Promise<RunController> {
    const stored = await store.getClassRevision(run.revisionSourceHash);
    if (!stored) throw new Error(`recovery: class revision ${run.revisionSourceHash} missing for run ${run.runId}`);
    const def = stored.definition;
    const stepCount = savasanaStepCountOf(def);
    const events = await store.getEvents(run.runId);

    // Consistency check: trust the event log, repair a disagreeing projection.
    const rebuilt = rebuildProjections(events, stepCount);
    let effectiveRun = run;
    if (!projectionsEqual(rebuilt, run.projection)) {
      await store.repairProjection(run.runId, rebuilt);
      effectiveRun = { ...run, projection: rebuilt };
    }
    return new RunController(store, env, def, effectiveRun, [...events], stepCount);
  }

  // --- Read model -----------------------------------------------------------

  get runId(): string {
    return this.run.runId;
  }
  get status(): RunStateKind {
    return this.run.status;
  }
  get definition(): ClassDefinition {
    return this.def;
  }
  /** A copy of the current in-memory event log (durable and in-memory are equal after each action). */
  eventLog(): RunEvent[] {
    return [...this.events];
  }

  snapshot(): RunSnapshot {
    const proj = this.run.projection;
    const segment = proj.currentSegmentId
      ? this.def.expandedRuntimeSegments.find((s) => s.id === proj.currentSegmentId) ?? null
      : null;
    return {
      runId: this.run.runId,
      classId: this.run.classId,
      status: this.run.status,
      currentSegmentId: proj.currentSegmentId,
      currentSegment: segment,
      side: segment ? segment.side : null,
      savasanaStep: proj.savasanaStep,
      savasanaStepCount: this.stepCount,
      expandedReferenceSegmentId: proj.expandedReferenceSegmentId,
      wakeMessageShown: proj.wakeMessageShown,
    };
  }

  // --- Single-flight guard --------------------------------------------------

  /**
   * Reject-while-pending (QUEUE_POLICY): a second action arriving while one is in
   * flight is rejected as 'busy' rather than queued, so a physical double-tap
   * advances exactly one segment (F9). The guard set is synchronous — it happens
   * before any await — so a second call in the same tick sees `pending` true. A
   * rejected caller may retry once the pending action settles; a failed
   * transaction clears the flag and leaves state consistent and retryable.
   */
  private async withGuard(fn: () => Promise<ActionResult>): Promise<ActionResult> {
    if (this.pending) return { ok: false, rejected: 'busy' };
    this.pending = true;
    try {
      return await fn();
    } finally {
      this.pending = false;
    }
  }

  private sample(): EventSample {
    return sampleFrom(this.env.clock, this.env.offsetMinutes, this.env.executionId);
  }

  private currentIndex(): number {
    const id = this.run.projection.currentSegmentId;
    if (id === null) return -1;
    return this.def.expandedRuntimeSegments.findIndex((s) => s.id === id);
  }

  /**
   * Append one event, compute the projection from the resulting log, and persist
   * both in one transaction. Commits the in-memory log and run record only after
   * the durable write completes (persist-before-acknowledge). `status` may be
   * updated atomically for lifecycle events.
   */
  private async commit(
    build: (sample: EventSample, seq: number) => RunEvent,
    durability: 'strict' | 'relaxed',
    statusPatch?: RunStateKind,
  ): Promise<RunSnapshot> {
    const sample = this.sample();
    const event = build(sample, this.events.length);
    const nextEvents = [...this.events, event];
    const projection = rebuildProjections(nextEvents, this.stepCount);
    await this.store.appendEvent(
      this.run.runId,
      event,
      { projection, status: statusPatch },
      durability,
    );
    this.events = nextEvents;
    this.run = {
      ...this.run,
      projection,
      status: statusPatch ?? this.run.status,
      updatedAt: sample.wall,
    };
    return this.snapshot();
  }

  private baseFields(sample: EventSample, seq: number) {
    return {
      seq,
      wall: sample.wall,
      wallEpochMs: sample.wallEpochMs,
      monotonic: sample.monotonic,
      executionId: sample.executionId,
    };
  }

  // --- Teaching-state actions (strict, serialized) --------------------------

  /** Enter the next expanded segment. Invalid at the last segment. */
  nextSegment(): Promise<ActionResult> {
    return this.withGuard(async () => {
      const i = this.currentIndex();
      const next = this.def.expandedRuntimeSegments[i + 1];
      if (!next) return { ok: false, rejected: 'invalid', reason: 'no next segment' };
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'segment_entered', segmentId: next.id }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  /**
   * Return to the previous expanded segment. Appends `segment_back` then a new
   * `segment_entered` visit (the earlier visit is preserved). Invalid at the first
   * segment.
   */
  previousSegment(): Promise<ActionResult> {
    return this.withGuard(async () => {
      const i = this.currentIndex();
      const prev = this.def.expandedRuntimeSegments[i - 1];
      if (i <= 0 || !prev) return { ok: false, rejected: 'invalid', reason: 'no previous segment' };
      // Two events, both durable, in strict transactions; single-flight keeps them ordered.
      await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'segment_back', toSegmentId: prev.id }),
        'strict',
      );
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'segment_entered', segmentId: prev.id }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  /** Advance one savasana step. Invalid outside savasana or at the last step. */
  savasanaStepForward(): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (!this.inSavasana()) return { ok: false, rejected: 'invalid', reason: 'not in savasana' };
      if (this.run.projection.savasanaStep >= this.stepCount - 1) {
        return { ok: false, rejected: 'invalid', reason: 'at last savasana step' };
      }
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'savasana_step_advanced' }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  /** Step back one savasana step. Invalid outside savasana or at the first step. */
  savasanaStepBack(): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (!this.inSavasana()) return { ok: false, rejected: 'invalid', reason: 'not in savasana' };
      if (this.run.projection.savasanaStep <= 0) {
        return { ok: false, rejected: 'invalid', reason: 'at first savasana step' };
      }
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'savasana_step_back' }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  /** Mark a segment skipped (does not change the authored plan). */
  skip(segmentId: string): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (!this.hasSegment(segmentId)) return { ok: false, rejected: 'invalid', reason: 'unknown segment' };
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'segment_skipped', segmentId }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  /** Note a substitution for a segment (short replacement name). */
  substitute(segmentId: string, substitutedWith: string): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (!this.hasSegment(segmentId)) return { ok: false, rejected: 'invalid', reason: 'unknown segment' };
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'substitution_noted', segmentId, substitutedWith }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  // --- Wake message (strict, persist-before-render) -------------------------

  /**
   * Persist `wake_message_shown` before the caller renders the message (E6). A
   * no-op (invalid) if already shown or the run is not active. The strict write
   * completes before the result returns, so a reload after 7:58 recovers with the
   * message present and no replayed fade.
   */
  markWakeShown(): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (this.run.status !== 'active_run') return { ok: false, rejected: 'invalid', reason: 'run not active' };
      if (this.run.projection.wakeMessageShown) return { ok: false, rejected: 'invalid', reason: 'already shown' };
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'wake_message_shown' }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  // --- Presentation actions (relaxed) ---------------------------------------

  /** Expand a segment's reference. Presentation-class: relaxed durability. */
  expandReference(segmentId: string): Promise<ActionResult> {
    return this.withGuard(async () => {
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'reference_expanded', segmentId }),
        'relaxed',
      );
      return { ok: true, snapshot };
    });
  }

  /** Collapse a segment's reference. Presentation-class: relaxed durability. */
  collapseReference(segmentId: string): Promise<ActionResult> {
    return this.withGuard(async () => {
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'reference_collapsed', segmentId }),
        'relaxed',
      );
      return { ok: true, snapshot };
    });
  }

  // --- Lifecycle transitions ------------------------------------------------

  /**
   * Record the state transition for Finish. The deliberate two-step confirmation
   * is the UI's job; the machine exposes the transition. Appends `run_finished`
   * (strict) and moves to `finished_run_pending_notes`.
   */
  finish(): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (this.run.status !== 'active_run') return { ok: false, rejected: 'invalid', reason: 'run not active' };
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'run_finished' }),
        'strict',
        'finished_run_pending_notes',
      );
      return { ok: true, snapshot };
    });
  }

  /** Abandon the run: appends `run_abandoned` (strict), moves to `abandoned_run`. */
  abandon(): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (this.run.status !== 'active_run') return { ok: false, rejected: 'invalid', reason: 'run not active' };
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'run_abandoned' }),
        'strict',
        'abandoned_run',
      );
      return { ok: true, snapshot };
    });
  }

  /**
   * Resume an interrupted run. Appends `run_resumed` carrying THIS execution's
   * identity (a controller loaded after process death holds a fresh env), then
   * returns to the exact segment. Status stays `active_run`.
   */
  resume(): Promise<ActionResult> {
    return this.withGuard(async () => {
      if (this.run.status !== 'active_run') return { ok: false, rejected: 'invalid', reason: 'run not active' };
      const snapshot = await this.commit(
        (s, seq) => ({ ...this.baseFields(s, seq), type: 'run_resumed' }),
        'strict',
      );
      return { ok: true, snapshot };
    });
  }

  // --- Notes ----------------------------------------------------------------

  /** Save the draft post-class note (strict; H1). */
  async saveDraftNote(draft: string): Promise<void> {
    await this.store.saveDraftNote(this.run.runId, draft, this.sample().wall);
  }

  /** Finalize notes and complete the run (strict). Moves to `completed_run`. */
  async finalizeNotes(final: string): Promise<RunSnapshot> {
    const wall = this.sample().wall;
    await this.store.finalizeNotes(this.run.runId, final, wall);
    this.run = { ...this.run, status: 'completed_run', updatedAt: wall };
    return this.snapshot();
  }

  // --- Helpers --------------------------------------------------------------

  private inSavasana(): boolean {
    const seg = this.def.expandedRuntimeSegments.find((s) => s.id === this.run.projection.currentSegmentId);
    return seg?.type === 'savasana';
  }

  private hasSegment(segmentId: string): boolean {
    return this.def.expandedRuntimeSegments.some((s) => s.id === segmentId);
  }
}

function generateId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
  return `${prefix}-${rand}`;
}
