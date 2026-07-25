// AppController — the one centralized renderer and dispatcher.
//
// A state-driven router (no URL routing): a single render() over the app state
// rebuilds #app; live ticks refresh only time-dependent nodes in place. Every
// teaching action flows through the RunController (persist-before-acknowledge,
// single-flight); a rejected `busy` result is silently ignored so a double tap
// never double-advances (F9). Display values are always recomputed from durable
// timestamps through src/model — this layer never does timing math.
//
// The renderer/dispatcher centralization, deterministic focus/teardown, and
// state-transition tests are the conditions the Phase 1 review set for shipping
// without a framework (decision log, July 22 2026).

import '../assets/fonts/fonts.css';
import './styles/tokens.css';
import './styles/app.css';

import {
  EXECUTION_ID,
  deriveWakeState,
  isoOffsetMinutes,
  sampleFrom,
  SystemClock,
  type Clock,
} from '../model/index.js';
import type {
  ClassDefinition,
  EventSample,
  RunStartedEvent,
} from '../schema/index.js';
import {
  RunController,
  buildRecoverySnapshot,
  type BeginResult,
  type RecoverySnapshot,
} from '../run/index.js';
import { Store, type StoredClassRevision, type StoredRun, type LibrarySnapshot } from '../store/index.js';
import { APP_VERSION } from '../version.js';
import {
  exportAsTaught,
  exportOriginalMarkdown,
  finishInstant,
  buildBackup,
  serializeBackup,
  backupFilenameFor,
  parseBackupText,
  validateBackup,
} from '../export/index.js';
import { clear, el } from './dom.js';
import { renderHome } from './screens/home.js';
import { renderEmpty } from './screens/empty.js';
import { renderImport } from './screens/import.js';
import { renderLibrary } from './screens/library.js';
import { renderClassDetail } from './screens/class-detail.js';
import { renderPrep } from './screens/prep.js';
import { renderLive } from './screens/live.js';
import { renderRecovery } from './screens/recovery.js';
import { renderPostClass } from './screens/post-class.js';
import { renderDialog } from './screens/dialogs.js';
import { WakeLockManager } from './wake-lock.js';
import { backIsIntercepted, resolveBack } from './back-stack.js';
import { enterClass } from './motion.js';
import { downloadMarkdown, downloadJson, copyToClipboard } from './deliver.js';
import {
  groupClasses,
  pickUpcomingClassId,
  upcomingChoiceIsAmbiguous,
  upcomingDefinition,
  type ClassGroup,
} from './library-model.js';
import {
  loadPreferences,
  setNextPosePreview,
  setUpcomingClassId,
  type Preferences,
} from './preferences.js';
import type {
  AppActions,
  Dialog,
  ImportView,
  LiveHandle,
  LiveProps,
  RestoreView,
  Route,
  RunRow,
} from './view-types.js';

export interface AppOptions {
  readonly store: Store;
  readonly root: HTMLElement;
  readonly clock?: Clock;
  readonly offsetMinutes?: number;
  readonly executionId?: string;
}

export class AppController {
  private route: Route = { kind: 'loading' };
  private dialog: Dialog | null = null;

  private controller: RunController | null = null;
  private recoverySnapshot: RecoverySnapshot | null = null;
  private upcomingDef: ClassDefinition | null = null;
  private upcomingClassId: string | null = null;
  private revisions: readonly StoredClassRevision[] = [];
  private runs: readonly StoredRun[] = [];
  private groups: readonly ClassGroup[] = [];

  /** The class Prep/Begin acts on: the upcoming class, or a chosen rerun class. */
  private prepDef: ClassDefinition | null = null;

  /** Import screen state machine (screen-states § 2). */
  private importState: ImportView = { phase: 'input', source: '' };

  /** Restore section state, plus the validated payload awaiting merge/replace. */
  private restoreState: RestoreView = { phase: 'idle' };
  private pendingRestore: LibrarySnapshot | null = null;

  /** §14 storage warning: rechecked when the Library opens, never during a run. */
  private storageWarning = false;

  // §14 "Update ready · apply now": set by the SW registration when a waiting
  // worker appears. The pill shows only outside a run (Home / Library); applying
  // messages skipWaiting and reloads. Never surfaced or applied during a run (A5).
  private updateReady = false;
  private applyUpdateFn: (() => void) | null = null;

  private finishArmed = false;
  private draftNote = '';

  // Wake-message fade discipline: durable latch guarantees fade-once across
  // reloads (E6); these session flags guarantee fade-once within a session and
  // no fade on recovery.
  private wakeAlreadyShownAtBoot = false;
  private wakeFadePlayed = false;
  private wakeVisibleRendered = false;
  private wakeAppendInFlight = false;

  private liveHandle: LiveHandle | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private sentinelArmed = false;

  private pendingChain: Promise<void> = Promise.resolve();

  private readonly wakeLock: WakeLockManager;
  private readonly actions: AppActions;

  private constructor(
    private readonly store: Store,
    private readonly root: HTMLElement,
    private readonly clock: Clock,
    private readonly offsetMinutes: number,
    private readonly executionId: string,
    private prefs: Preferences,
  ) {
    this.wakeLock = new WakeLockManager(() => this.onWakeLockStateChange());
    this.actions = this.buildActions();
  }

  /** Boot: open state, load preferences, and route to recovery / home / empty. */
  static async boot(options: AppOptions): Promise<AppController> {
    const clock = options.clock ?? new SystemClock();
    const offsetMinutes = options.offsetMinutes ?? isoOffsetMinutes(clock.now());
    const executionId = options.executionId ?? EXECUTION_ID;
    const prefs = await loadPreferences(options.store);

    const app = new AppController(
      options.store,
      options.root,
      clock,
      offsetMinutes,
      executionId,
      prefs,
    );
    await app.initialRoute();
    app.render();
    return app;
  }

  // --- Test / lifecycle surface ---------------------------------------------

  /** The current route kind (for tests and diagnostics). */
  get routeKind(): Route['kind'] {
    return this.route.kind;
  }

  /** The open dialog kind, or null. */
  get dialogKind(): Dialog['kind'] | null {
    return this.dialog ? this.dialog.kind : null;
  }

  /**
   * Test-only: the action surface. DOM tests use this to drive flows that are
   * normally entered through a native file picker (import-by-file, restore), which
   * cannot be synthesized reliably in happy-dom. Production code never reads it.
   */
  get actionsForTest(): AppActions {
    return this.actions;
  }

  /** Await every in-flight dispatched action (tests drive the DOM, then await). */
  async idle(): Promise<void> {
    await this.pendingChain;
  }

  /**
   * The SW registration reports a waiting worker. Store the applier and re-render
   * so Home/Library surface §14's quiet "Update ready" pill — but never mid-run,
   * and a re-render during a run is skipped so nothing disturbs the live surface.
   */
  setUpdateReady(ready: boolean, apply: () => void): void {
    this.updateReady = ready;
    this.applyUpdateFn = ready ? apply : null;
    if (this.route.kind !== 'run') this.render();
  }

  /** One render tick: refresh live time nodes, or rebuild on a structural change. */
  tick(): void {
    if (this.route.kind !== 'run' || !this.controller) return;
    const now = this.sampleNow();

    // The message appearing (or disappearing) is a STRUCTURAL change, so rebuild.
    // The durable `wake_message_shown` write is issued by buildLiveProps, on the
    // render path itself — never here on the clock alone (Q5a).
    if (this.wakeVisibleNow(now) !== this.wakeVisibleRendered) {
      this.render();
      return;
    }
    this.liveHandle?.update(now);
  }

  /** Start the production 1 Hz tick and platform listeners. Tests skip this. */
  start(): void {
    if (this.tickTimer === null) {
      this.tickTimer = setInterval(() => this.tick(), 1000);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.onPopState);
    }
  }

  /** Stop timers and listeners (deterministic teardown). */
  stop(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopState);
    }
  }

  // --- Routing --------------------------------------------------------------

  private async initialRoute(): Promise<void> {
    const active = await RunController.loadActive(this.store, this.env());
    if (active) {
      this.controller = active;
      this.wakeAlreadyShownAtBoot = active.snapshot().wakeMessageShown;
      this.recoverySnapshot = buildRecoverySnapshot(active, this.clock);
      this.route = { kind: 'recovery' };
      return;
    }
    await this.loadLibrary();
    this.route = this.upcomingDef ? { kind: 'home' } : { kind: 'empty' };
  }

  private async loadLibrary(): Promise<void> {
    this.revisions = await this.store.getAllClassRevisions();
    this.runs = await this.store.getAllRuns();
    this.groups = groupClasses(this.revisions, this.runs);
    this.upcomingClassId = pickUpcomingClassId(this.groups, this.prefs.upcomingClassId, this.todayLocalDate());
    this.upcomingDef = upcomingDefinition(this.groups, this.upcomingClassId);
  }

  /** The device's local calendar date (YYYY-MM-DD) at the current offset. */
  private todayLocalDate(): string {
    return new Date(this.clock.now().getTime() + this.offsetMinutes * 60_000)
      .toISOString()
      .slice(0, 10);
  }

  /** Best-effort persistent-storage request + recheck for the §14 warning. */
  private async refreshStorageWarning(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persisted) {
      this.storageWarning = false;
      return;
    }
    try {
      const persisted = await navigator.storage.persisted();
      this.storageWarning = !persisted;
    } catch {
      this.storageWarning = false;
    }
  }

  /** Ask the platform to persist storage (best-effort; after the first import). */
  private async requestPersist(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return;
    try {
      await navigator.storage.persist();
    } catch {
      /* best-effort only; the backup export is the real safety net */
    }
  }

  private async gotoHomeOrEmpty(): Promise<void> {
    await this.loadLibrary();
    this.route = this.upcomingDef ? { kind: 'home' } : { kind: 'empty' };
  }

  private enterRecoveryFromController(): void {
    if (!this.controller) return;
    this.recoverySnapshot = buildRecoverySnapshot(this.controller, this.clock);
    this.route = { kind: 'recovery' };
  }

  // --- Central render -------------------------------------------------------

  render(): void {
    this.liveHandle = null;
    clear(this.root);

    const screen = this.buildScreen();
    // The segment/screen enter animation (cross-fade + settle), honoring reduced
    // motion via the class contract in motion.ts. A new element mounts each render,
    // so the one-shot animation plays exactly once per structural change.
    screen.classList.add(enterClass());
    this.root.appendChild(screen);

    if (this.dialog) {
      this.root.appendChild(renderDialog(this.dialog, this.actions));
    }

    this.applyFocus();
    this.armSentinel();
  }

  private buildScreen(): HTMLElement {
    switch (this.route.kind) {
      case 'loading':
        return this.loadingScreen();
      case 'empty':
        return renderEmpty({ actions: this.actions, updateReady: this.updateReady });
      case 'home':
        return renderHome({
          upcoming: this.upcomingDef,
          actions: this.actions,
          updateReady: this.updateReady,
        });
      case 'import':
        return renderImport({ view: this.importState, actions: this.actions });
      case 'library':
        return renderLibrary({
          groups: this.groups,
          upcomingClassId: this.upcomingClassId,
          ambiguousUpcoming: upcomingChoiceIsAmbiguous(this.groups, this.todayLocalDate()),
          restore: this.restoreState,
          storageWarning: this.storageWarning,
          updateReady: this.updateReady,
          offsetMinutes: this.offsetMinutes,
          actions: this.actions,
        });
      case 'class-detail':
        return this.buildClassDetail(this.route.classId);
      case 'prep': {
        const def = this.prepDef ?? this.upcomingDef;
        return def
          ? renderPrep({
              def,
              runStartedPreviewEpochMs: this.prepPreviewStart(def),
              offsetMinutes: this.offsetMinutes,
              prefs: this.prefs,
              actions: this.actions,
            })
          : renderEmpty({ actions: this.actions, updateReady: this.updateReady });
      }
      case 'recovery':
        return this.recoverySnapshot
          ? renderRecovery({
              snapshot: this.recoverySnapshot,
              offsetMinutes: this.offsetMinutes,
              actions: this.actions,
            })
          : this.loadingScreen();
      case 'run':
        return this.buildLive();
      case 'post-class':
        return this.controller
          ? renderPostClass({
              def: this.controller.definition,
              events: this.controller.eventLog(),
              draftNote: this.draftNote,
              offsetMinutes: this.offsetMinutes,
              actions: this.actions,
            })
          : this.loadingScreen();
    }
  }

  private buildLive(): HTMLElement {
    const props = this.buildLiveProps();
    const handle = renderLive(props);
    this.liveHandle = handle;
    return handle.root;
  }

  private buildLiveProps(): LiveProps {
    const controller = this.controller!;
    const now = this.sampleNow();
    const ctx = this.runContext();
    const events = controller.eventLog();
    const snapshot = controller.snapshot();

    // Both halves of the gate: the clock has reached hard close − 2 min AND the
    // current segment is Savasana (Q5a). Nothing shows outside Savasana.
    const wakeVisible = this.wakeVisibleNow(now);
    // Persist `wake_message_shown` immediately BEFORE the render that first shows
    // the message — on the render path, so it can never be written on time alone
    // while another segment is current (E3/E6/E8).
    this.syncWakeAppend(wakeVisible);
    this.wakeVisibleRendered = wakeVisible;

    const wakeFade = wakeVisible && !this.wakeAlreadyShownAtBoot && !this.wakeFadePlayed;
    if (wakeFade) this.wakeFadePlayed = true;

    const referenceOpen =
      snapshot.expandedReferenceSegmentId !== null &&
      snapshot.expandedReferenceSegmentId === snapshot.currentSegmentId;

    return {
      def: controller.definition,
      snapshot,
      events,
      runStartedAtEpochMs: ctx.runStartedAtEpochMs,
      hardCloseAtEpochMs: ctx.hardCloseAtEpochMs,
      hardCloseLocal: this.hardCloseLocal(),
      offsetMinutes: this.offsetMinutes,
      now,
      referenceOpen,
      finishArmed: this.finishArmed,
      wakeFade,
      prefs: this.prefs,
      wakeLock: { available: !this.wakeLock.isUnavailable, held: this.wakeLock.isHeld },
      actions: this.actions,
    };
  }

  private loadingScreen(): HTMLElement {
    return el('section', {
      class: 'screen',
      attrs: { 'data-screen': 'loading' },
      children: [el('p', { class: 'loading-copy', text: 'Opening…' })],
    });
  }

  private buildClassDetail(classId: string): HTMLElement {
    const group = this.groups.find((g) => g.classId === classId);
    if (!group) return renderEmpty({ actions: this.actions, updateReady: this.updateReady });
    return renderClassDetail({
      group,
      isUpcoming: this.upcomingClassId === classId,
      runs: this.runRowsFor(classId),
      offsetMinutes: this.offsetMinutes,
      actions: this.actions,
    });
  }

  /** Taught runs for a class, newest first — one detail row + export handle each. */
  private runRowsFor(classId: string): RunRow[] {
    return this.runs
      .filter((r) => r.classId === classId)
      .sort((a, b) => b.runStartedAtEpochMs - a.runStartedAtEpochMs)
      .map((r) => ({
        runId: r.runId,
        runLocalDate: r.runLocalDate,
        startedAtEpochMs: r.runStartedAtEpochMs,
        status: r.status,
      }));
  }

  // --- Actions --------------------------------------------------------------

  private buildActions(): AppActions {
    return {
      openPrep: () => {
        this.prepDef = this.upcomingDef;
        this.route = { kind: 'prep' };
        this.render();
      },
      applyUpdate: () => {
        // A5: only ever apply an update outside a run. The pill is shown only on
        // idle screens, but guard here too so nothing can swap versions mid-class.
        if (this.route.kind === 'run' || this.route.kind === 'recovery') return;
        this.applyUpdateFn?.();
      },
      beginClass: () => this.beginClass(),
      next: () => this.next(),
      previous: () => this.previous(),
      toggleReference: () => this.toggleReference(),
      closeReference: () => this.closeReference(),
      setNextPosePreview: (value) => this.setPreview(value),
      retryWakeLock: () => this.dispatch(async () => { await this.wakeLock.request(); }),

      openLeaveGuard: () => { this.dialog = { kind: 'leave-guard' }; this.render(); },
      closeDialog: () => { this.dialog = null; this.render(); },
      leaveOpen: () => { this.dialog = null; this.enterRecoveryFromController(); this.render(); },
      requestEndRun: () => { this.dialog = { kind: 'end-run-confirm' }; this.render(); },
      confirmEndRun: () => this.endRun(),

      requestFinish: () => { this.dialog = { kind: 'finish-confirm' }; this.render(); },
      confirmFinish: () => this.finish(),

      resume: () => this.resume(),
      requestEndRecovery: () => { this.dialog = { kind: 'recovery-end-confirm' }; this.render(); },
      confirmEndRecovery: () => this.endRun(),

      saveNote: (value) => this.saveNote(value),
      finalizeNotes: () => this.finalize(this.draftNote),
      skipNotes: () => this.finalize(''),

      // --- Navigation between the library-side screens ---------------------
      openImport: () => {
        this.importState = { phase: 'input', source: '' };
        this.route = { kind: 'import' };
        this.render();
      },
      openLibrary: () => this.dispatch(async () => {
        await this.loadLibrary();
        await this.refreshStorageWarning();
        this.restoreState = { phase: 'idle' };
        this.route = { kind: 'library' };
      }),
      openClassDetail: (classId) => this.dispatch(async () => {
        await this.loadLibrary();
        this.route = { kind: 'class-detail', classId };
      }),
      goHome: () => this.dispatch(async () => {
        await this.gotoHomeOrEmpty();
      }),

      // --- Import flow (screen-states § 2) ---------------------------------
      importFileLoaded: (source) => {
        this.importState = { phase: 'input', source };
        this.route = { kind: 'import' };
        this.render();
      },
      importValidate: (source) => this.importValidate(source),
      importCheckAgain: () => this.importBackToInput(),
      importReturnToSource: () => this.importBackToInput(),
      importCopyErrors: () => this.importCopyErrors(),
      importConfirm: () => this.importConfirm(),
      importOpenExisting: (classId) => this.dispatch(async () => {
        await this.loadLibrary();
        this.importState = { phase: 'input', source: '' };
        this.route = { kind: 'class-detail', classId };
      }),

      // --- Library / class detail ------------------------------------------
      setUpcoming: (classId) => this.dispatch(async () => {
        await setUpcomingClassId(this.store, classId);
        this.prefs = { ...this.prefs, upcomingClassId: classId };
        await this.loadLibrary();
        this.route = { kind: 'library' };
      }),
      runClassAgain: (classId) => {
        const def = upcomingDefinition(this.groups, classId);
        if (!def) return;
        this.prepDef = def;
        this.route = { kind: 'prep' };
        this.render();
      },
      exportOriginal: (sourceHash) => this.exportOriginal(sourceHash),
      exportAsTaughtRun: (runId) => this.exportAsTaughtRun(runId),

      // --- Backup / restore (screen-states § 13) ---------------------------
      exportBackup: () => this.exportBackup(),
      restoreFileLoaded: (text) => this.restoreFileLoaded(text),
      restoreMerge: () => this.applyRestore('merge'),
      requestRestoreReplace: () => { this.dialog = { kind: 'restore-replace-confirm' }; this.render(); },
      confirmRestoreReplace: () => this.applyRestore('replace'),
      dismissRestore: () => {
        this.restoreState = { phase: 'idle' };
        this.pendingRestore = null;
        this.render();
      },
    };
  }

  // --- Import flow implementation -------------------------------------------

  private importValidate(source: string): void {
    this.importState = { phase: 'validating', source };
    this.render();
    this.dispatch(async () => {
      // The parser (and its `yaml` dependency) is imported lazily so it ships as a
      // separate chunk, out of the teaching shell — it is only needed on the Import
      // screen. The SW precache walks the whole dist/, so the chunk is still cached
      // for offline import.
      const { importClass } = await import('../parser/index.js');
      const result = await importClass(source);
      if (!result.ok) {
        this.importState = { phase: 'error', source, errors: result.errors, copied: false };
        return;
      }
      const def = result.classDefinition;
      const existing = await this.store.getClassRevision(def.sourceHash);
      if (existing) {
        // Exact source_hash already present → open the existing class (C5).
        this.importState = { phase: 'duplicate', source, existingClassId: existing.classId };
        return;
      }
      const sameId = await this.store.getClassRevisionsByClassId(def.classId);
      this.importState = {
        phase: 'confirm',
        source,
        kind: sameId.length > 0 ? 'revision' : 'new', // same class_id, different hash → revision (C6)
        def,
        summary: result.summary,
        warnings: result.warnings,
      };
    });
  }

  private importBackToInput(): void {
    const source = 'source' in this.importState ? this.importState.source : '';
    this.importState = { phase: 'input', source };
    this.render();
  }

  private importCopyErrors(): void {
    this.dispatch(async () => {
      if (this.importState.phase !== 'error') return;
      const text = this.importState.errors
        .map((e) => {
          const locus = [e.segment, e.field, e.sourceLine !== null ? `line ${e.sourceLine}` : null]
            .filter((x): x is string => Boolean(x))
            .join(' · ');
          return locus ? `${locus}: ${e.message}` : e.message;
        })
        .join('\n');
      await copyToClipboard(text);
      if (this.importState.phase === 'error') {
        this.importState = { ...this.importState, copied: true };
      }
    });
  }

  private importConfirm(): void {
    this.dispatch(async () => {
      if (this.importState.phase !== 'confirm') return;
      const { def, warnings } = this.importState;
      const record: StoredClassRevision = {
        sourceHash: def.sourceHash,
        classId: def.classId,
        schemaVersion: def.schemaVersion,
        warnings,
        importedAt: this.nowIso(),
        definition: def,
      };
      await this.store.putClassRevision(record);
      await this.requestPersist(); // request persistence after the first successful import
      this.importState = { phase: 'input', source: '' };
      await this.gotoHomeOrEmpty(); // the imported class now surfaces as upcoming
    });
  }

  // --- Export / backup / restore implementation -----------------------------

  private exportOriginal(sourceHash: string): void {
    this.dispatch(async () => {
      const rev = await this.store.getClassRevision(sourceHash);
      if (!rev) return;
      downloadMarkdown(`${rev.classId}.md`, exportOriginalMarkdown(rev.definition));
    });
  }

  private exportAsTaughtRun(runId: string): void {
    this.dispatch(async () => {
      const run = await this.store.getRun(runId);
      if (!run) return;
      const rev = await this.store.getClassRevision(run.revisionSourceHash);
      if (!rev) return;
      const events = await this.store.getEvents(runId);
      const notes = await this.store.getNotes(runId);
      const markdown = exportAsTaught({
        definition: rev.definition,
        revisionSourceHash: run.revisionSourceHash,
        runId: run.runId,
        runLocalDate: run.runLocalDate,
        runStartedAt: run.runStartedAt,
        runFinishedAt: finishInstant(events),
        hardCloseAt: run.hardCloseAt,
        appVersion: APP_VERSION,
        events,
        roomNote: notes?.final ?? null,
      });
      downloadMarkdown(`as-taught-${run.classId}-${run.runLocalDate}.md`, markdown);
    });
  }

  private exportBackup(): void {
    this.dispatch(async () => {
      const snapshot = await this.store.exportLibrary();
      const file = buildBackup(snapshot, this.nowIso(), APP_VERSION);
      const filename = backupFilenameFor(this.clock.now().getTime(), this.offsetMinutes);
      downloadJson(filename, serializeBackup(file));
    });
  }

  private restoreFileLoaded(text: string): void {
    this.dispatch(async () => {
      const parsed = parseBackupText(text);
      if (!parsed.ok) return this.showRestoreError(parsed.reason);
      const validation = validateBackup(parsed.value);
      if (!validation.ok) return this.showRestoreError(validation.reason);
      this.pendingRestore = validation.payload;
      this.restoreState = {
        phase: 'confirm',
        counts: { classes: validation.payload.revisions.length, runs: validation.payload.runs.length },
      };
      await this.loadLibrary();
      await this.refreshStorageWarning();
      this.route = { kind: 'library' };
    });
  }

  private async showRestoreError(reason: string): Promise<void> {
    this.pendingRestore = null;
    this.restoreState = { phase: 'error', reason };
    await this.loadLibrary();
    await this.refreshStorageWarning();
    this.route = { kind: 'library' };
  }

  private applyRestore(mode: 'merge' | 'replace'): void {
    this.dispatch(async () => {
      if (!this.pendingRestore) {
        this.dialog = null;
        return;
      }
      await this.store.restore(this.pendingRestore, mode);
      this.pendingRestore = null;
      this.restoreState = { phase: 'idle' };
      this.dialog = null;
      // A replace may have overwritten preferences (e.g. the upcoming choice).
      this.prefs = await loadPreferences(this.store);
      await this.loadLibrary();
      this.route = { kind: 'library' };
    });
  }

  /** ISO 8601 with offset for the current instant (for importedAt / exported_at). */
  private nowIso(): string {
    return this.sampleNow().wall;
  }

  private beginClass(): void {
    const def = this.upcomingDef;
    if (!def) return;
    // Fire the wake-lock request synchronously inside the Begin gesture task, in
    // parallel with persistence (wake-lock treaty; risk carried from M4a). Some
    // browsers only grant `navigator.wakeLock.request` from within the originating
    // user-gesture task, and the IndexedDB write below would push a later request
    // out of that window. The request never blocks the run: a denied lock only
    // shows the quiet indicator (G1); a lock granted here is reconciled after
    // persistence — released if the run does not actually start.
    const wakeRequest = this.wakeLock.request();
    this.dispatch(async () => {
      let result: BeginResult;
      try {
        result = await RunController.begin(this.store, this.env(), def);
      } catch (err) {
        // Persist threw: a lock granted in the gesture must not linger.
        await this.releaseSpeculativeWake(wakeRequest);
        throw err;
      }
      if (!result.ok) {
        // An active run already exists (F7): route to recovery rather than begin,
        // and release the speculative lock — recovery re-requests on Resume.
        await this.releaseSpeculativeWake(wakeRequest);
        const active = await RunController.loadActive(this.store, this.env());
        if (active) {
          this.controller = active;
          this.wakeAlreadyShownAtBoot = active.snapshot().wakeMessageShown;
          this.enterRecoveryFromController();
        }
        return;
      }
      this.controller = result.controller;
      this.wakeAlreadyShownAtBoot = false;
      this.wakeFadePlayed = false;
      this.wakeVisibleRendered = false;
      this.finishArmed = false;
      this.route = { kind: 'run' };
      // The request already fired in the gesture; await only to settle its state
      // before the run renders. A denied lock never blocks (quiet indicator).
      await wakeRequest.catch(() => false);
    });
  }

  private next(): void {
    const snap = this.controller?.snapshot();
    const seg = snap?.currentSegment;
    if (!snap || !seg) return;
    if (seg.type === 'savasana') {
      if (snap.savasanaStep < snap.savasanaStepCount - 1) {
        this.finishArmed = false;
        this.dispatch(async () => { await this.controller?.savasanaStepForward(); });
      } else if (!this.finishArmed) {
        // After the final step, Next exposes Finish rather than finishing silently.
        this.finishArmed = true;
        this.render();
      }
    } else {
      this.finishArmed = false;
      this.dispatch(async () => { await this.controller?.nextSegment(); });
    }
  }

  private previous(): void {
    const snap = this.controller?.snapshot();
    const seg = snap?.currentSegment;
    if (!snap || !seg) return;
    this.finishArmed = false;
    if (seg.type === 'savasana' && snap.savasanaStep > 0) {
      this.dispatch(async () => { await this.controller?.savasanaStepBack(); });
    } else {
      this.dispatch(async () => { await this.controller?.previousSegment(); });
    }
  }

  private toggleReference(): void {
    const snap = this.controller?.snapshot();
    const seg = snap?.currentSegment;
    if (!snap || !seg) return;
    if (seg.type !== 'pose' && seg.type !== 'grounding') return; // center inert elsewhere
    const open = snap.expandedReferenceSegmentId === seg.id;
    this.dispatch(async () => {
      if (open) await this.controller?.collapseReference(seg.id);
      else await this.controller?.expandReference(seg.id);
    });
  }

  private closeReference(): void {
    const seg = this.controller?.snapshot().currentSegment;
    if (!seg) return;
    this.dispatch(async () => { await this.controller?.collapseReference(seg.id); });
  }

  private resume(): void {
    if (!this.controller) return;
    // Wake-lock request fired synchronously in the Resume gesture, same reason as
    // Begin (recovery treaty: resuming requests a new wake lock). Reconciled after
    // the resume persists; a denied lock never blocks the resumed run.
    const wakeRequest = this.wakeLock.request();
    this.dispatch(async () => {
      try {
        await this.controller!.resume();
      } catch (err) {
        await this.releaseSpeculativeWake(wakeRequest);
        throw err;
      }
      this.dialog = null;
      this.route = { kind: 'run' };
      this.wakeVisibleRendered = false;
      await wakeRequest.catch(() => false);
    });
  }

  private finish(): void {
    this.dispatch(async () => {
      await this.controller?.finish();
      await this.wakeLock.release();
      this.dialog = null;
      this.draftNote = '';
      this.route = { kind: 'post-class' };
    });
  }

  private endRun(): void {
    this.dispatch(async () => {
      await this.controller?.abandon();
      await this.wakeLock.release();
      this.controller = null;
      this.dialog = null;
      await this.gotoHomeOrEmpty();
    });
  }

  private finalize(note: string): void {
    this.dispatch(async () => {
      await this.controller?.finalizeNotes(note);
      this.controller = null;
      await this.gotoHomeOrEmpty();
    });
  }

  private saveNote(value: string): void {
    this.draftNote = value;
    // Persist without re-rendering, so the note field keeps focus and caret.
    this.track(this.controller ? this.controller.saveDraftNote(value) : Promise.resolve());
  }

  private setPreview(value: boolean): void {
    this.prefs = { ...this.prefs, nextPosePreview: value };
    this.track(setNextPosePreview(this.store, value));
    // The Prep checkbox already reflects the change; no re-render (keeps the
    // disclosure open). A running class picks up the preference on next render.
  }

  // --- Wake handling --------------------------------------------------------

  /**
   * Is the wake message displayable right now? Temporally eligible AND the current
   * segment is Savasana. The single place the app answers this question, so the
   * render path and the tick path can never disagree.
   */
  private wakeVisibleNow(now: EventSample): boolean {
    if (!this.controller) return false;
    const ctx = this.runContext();
    return deriveWakeState(
      now.wallEpochMs,
      ctx.hardCloseAtEpochMs,
      this.hardCloseLocal(),
      this.controller.eventLog(),
      this.controller.snapshot().currentSegment?.type === 'savasana',
    ).wakeMessageVisible;
  }

  private syncWakeAppend(wakeVisible: boolean): void {
    if (!wakeVisible || this.wakeAppendInFlight || !this.controller) return;
    if (this.controller.snapshot().wakeMessageShown) return;
    this.wakeAppendInFlight = true;
    this.track(
      this.controller
        .markWakeShown()
        .finally(() => { this.wakeAppendInFlight = false; }),
    );
  }

  private onWakeLockStateChange(): void {
    // Platform-side release/acquire: refresh the quiet indicator if a run is live.
    if (this.route.kind === 'run' && this.controller) this.render();
  }

  /**
   * Settle an in-flight speculative wake request (fired in a Begin/Resume gesture)
   * and release any lock it won. Used when the run does not actually start — a
   * failed persist or an existing active run — so a lock granted inside the gesture
   * never lingers on a non-run screen. Never throws: request() resolves to false on
   * failure, and releasing a lock the platform already dropped is a no-op.
   */
  private async releaseSpeculativeWake(request: Promise<boolean>): Promise<void> {
    await request.catch(() => false);
    await this.wakeLock.release();
  }

  // --- Dispatch and async plumbing ------------------------------------------

  private dispatch(fn: () => Promise<void>): void {
    const p = fn()
      .then(() => this.render())
      .catch((err) => this.reportError(err));
    this.track(p);
  }

  private track(p: Promise<unknown>): void {
    this.pendingChain = Promise.allSettled([this.pendingChain, p]).then(() => undefined);
  }

  private reportError(err: unknown): void {
    // Quiet, recoverable failure (principle 7): never an alarm. Log for dev only.
    if (typeof console !== 'undefined') console.error('[settle-in]', err);
  }

  // --- Platform wiring ------------------------------------------------------

  private readonly onVisibility = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && this.route.kind === 'run') {
      void this.wakeLock.reacquireIfWanted();
      this.tick();
    }
  };

  private readonly onPopState = (): void => {
    const ctx = this.backContext();
    const action = resolveBack(ctx);
    if (action === 'allow-history') {
      this.sentinelArmed = false;
      return;
    }
    if (action === 'close-dialog') this.actions.closeDialog();
    else if (action === 'collapse-reference') this.actions.closeReference();
    else if (action === 'open-leave-guard') this.actions.openLeaveGuard();
    // Re-arm the sentinel so a subsequent Back is intercepted too.
    if (typeof history !== 'undefined') {
      history.pushState({ settleIn: true }, '');
      this.sentinelArmed = true;
    }
  };

  private armSentinel(): void {
    if (typeof history === 'undefined') return;
    const intercept = backIsIntercepted(this.backContext());
    if (intercept && !this.sentinelArmed) {
      history.pushState({ settleIn: true }, '');
      this.sentinelArmed = true;
    } else if (!intercept) {
      this.sentinelArmed = false;
    }
  }

  private backContext(): { dialogOpen: boolean; referenceExpanded: boolean; runActive: boolean } {
    const snap = this.controller?.snapshot();
    const referenceExpanded =
      this.route.kind === 'run' &&
      !!snap &&
      snap.expandedReferenceSegmentId !== null &&
      snap.expandedReferenceSegmentId === snap.currentSegmentId;
    return {
      dialogOpen: this.dialog !== null,
      referenceExpanded,
      runActive: this.route.kind === 'run',
    };
  }

  // --- Focus ----------------------------------------------------------------

  private applyFocus(): void {
    if (this.dialog) {
      const target = this.root.querySelector<HTMLElement>('.sheet .btn');
      if (target) target.focus();
    }
  }

  // --- Small helpers --------------------------------------------------------

  private env() {
    return { clock: this.clock, offsetMinutes: this.offsetMinutes, executionId: this.executionId };
  }

  private sampleNow(): EventSample {
    return sampleFrom(this.clock, this.offsetMinutes, this.executionId);
  }

  private runContext(): { runStartedAtEpochMs: number; hardCloseAtEpochMs: number } {
    const started = this.controller
      ?.eventLog()
      .find((e): e is RunStartedEvent => e.type === 'run_started');
    return {
      runStartedAtEpochMs: started ? started.runStartedAtEpochMs : 0,
      hardCloseAtEpochMs: started ? started.hardCloseAtEpochMs : 0,
    };
  }

  private hardCloseLocal(): string {
    return this.controller ? this.controller.definition.hardCloseLocal : '20:00';
  }

  private prepPreviewStart(def: ClassDefinition): number {
    // Preview planned windows anchored to the scheduled start on the class date,
    // at the current offset. Begin Class re-anchors to the actual start.
    const [y, mo, d] = def.date.split('-').map((x) => Number.parseInt(x, 10));
    const [hh, mm] = def.scheduledStartLocal.split(':').map((x) => Number.parseInt(x, 10));
    return (
      Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0) -
      this.offsetMinutes * 60_000
    );
  }
}
