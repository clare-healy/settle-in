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
import { RunController, buildRecoverySnapshot, type RecoverySnapshot } from '../run/index.js';
import { Store, type StoredClassRevision } from '../store/index.js';
import { clear, el } from './dom.js';
import { renderHome } from './screens/home.js';
import { renderPrep } from './screens/prep.js';
import { renderLive } from './screens/live.js';
import { renderRecovery } from './screens/recovery.js';
import { renderPostClass } from './screens/post-class.js';
import { renderDialog } from './screens/dialogs.js';
import { WakeLockManager } from './wake-lock.js';
import { backIsIntercepted, resolveBack } from './back-stack.js';
import { enterClass } from './motion.js';
import { loadPreferences, setNextPosePreview, type Preferences } from './preferences.js';
import type {
  AppActions,
  Dialog,
  LiveHandle,
  LiveProps,
  Route,
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
  private revisions: readonly StoredClassRevision[] = [];

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

  /** Await every in-flight dispatched action (tests drive the DOM, then await). */
  async idle(): Promise<void> {
    await this.pendingChain;
  }

  /** One render tick: refresh live time nodes, or rebuild on a structural change. */
  tick(): void {
    if (this.route.kind !== 'run' || !this.controller) return;
    const now = this.sampleNow();
    const ctx = this.runContext();
    const wakeVisible =
      deriveWakeState(now.wallEpochMs, ctx.hardCloseAtEpochMs, this.hardCloseLocal(), this.controller.eventLog())
        .wakeMessageVisible;

    if (wakeVisible !== this.wakeVisibleRendered) {
      this.syncWakeAppend(wakeVisible);
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
    this.upcomingDef = this.pickUpcoming(this.revisions);
  }

  /** Suggest the earliest future class, else the most recent (screen-states § 3). */
  private pickUpcoming(revisions: readonly StoredClassRevision[]): ClassDefinition | null {
    if (revisions.length === 0) return null;
    const byDate = [...revisions].sort((a, b) => a.definition.date.localeCompare(b.definition.date));
    const todayLocal = new Date(this.clock.now().getTime() + this.offsetMinutes * 60_000)
      .toISOString()
      .slice(0, 10);
    const future = byDate.find((r) => r.definition.date >= todayLocal);
    const chosen = future ?? byDate[byDate.length - 1];
    return chosen ? chosen.definition : null;
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
        return this.emptyScreen();
      case 'home':
        return renderHome({ upcoming: this.upcomingDef, actions: this.actions });
      case 'prep':
        return this.upcomingDef
          ? renderPrep({
              def: this.upcomingDef,
              runStartedPreviewEpochMs: this.prepPreviewStart(this.upcomingDef),
              offsetMinutes: this.offsetMinutes,
              prefs: this.prefs,
              actions: this.actions,
            })
          : this.emptyScreen();
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

    const wakeVisible = deriveWakeState(
      now.wallEpochMs,
      ctx.hardCloseAtEpochMs,
      this.hardCloseLocal(),
      events,
    ).wakeMessageVisible;
    this.wakeVisibleRendered = wakeVisible;

    const wakeFade = wakeVisible && !this.wakeAlreadyShownAtBoot && !this.wakeFadePlayed;
    if (wakeFade) this.wakeFadePlayed = true;

    const snapshot = controller.snapshot();
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

  private emptyScreen(): HTMLElement {
    return el('section', {
      class: 'screen',
      attrs: { 'data-screen': 'empty' },
      children: [
        el('h1', { class: 'class-card__title', text: 'Settle In' }),
        el('p', { class: 'cue', text: 'Import your first authored class to begin.' }),
        el('button', {
          class: 'btn btn--quiet',
          text: 'Import a class',
          attrs: { disabled: 'true', 'aria-disabled': 'true', title: 'Coming in M5' },
        }),
        el('p', { class: 'stub', text: 'Import arrives in a later build (M5).' }),
      ],
    });
  }

  // --- Actions --------------------------------------------------------------

  private buildActions(): AppActions {
    return {
      openPrep: () => {
        this.route = { kind: 'prep' };
        this.render();
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

      correctSkip: (id) => this.dispatch(async () => { await this.controller?.skip(id); }),
      correctSubstitute: (id, name) => this.dispatch(async () => { await this.controller?.substitute(id, name); }),
      saveNote: (value) => this.saveNote(value),
      finalizeNotes: () => this.finalize(this.draftNote),
      skipNotes: () => this.finalize(''),
    };
  }

  private beginClass(): void {
    const def = this.upcomingDef;
    if (!def) return;
    this.dispatch(async () => {
      const result = await RunController.begin(this.store, this.env(), def);
      if (!result.ok) {
        // An active run already exists (F7): route to recovery rather than begin.
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
      await this.wakeLock.request();
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
    this.dispatch(async () => {
      await this.controller!.resume();
      this.dialog = null;
      this.route = { kind: 'run' };
      this.wakeVisibleRendered = false;
      await this.wakeLock.request();
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
