// Android system-back resolution — a pure decision function.
//
// screen-states.md § Android system back defines the exact order: close a dialog,
// then collapse an expanded reference, then (during an active run) open the guarded
// Leave Class sheet, then fall through to normal history outside a run. System
// Back never means "previous pose" and never silently exits an active run.
//
// The real interception uses a history sentinel + popstate (wired in app.ts).
// jsdom/happy-dom model history weakly, so this ordering is unit-tested directly
// here; the physical back-gesture behavior is verified on device / with Playwright
// (see the M4a report).

export interface BackContext {
  /** A dialog (leave guard, confirmation) is open. */
  readonly dialogOpen: boolean;
  /** The expanded reference state is showing. */
  readonly referenceExpanded: boolean;
  /** A run is active (live surface showing). */
  readonly runActive: boolean;
}

export type BackAction =
  | 'close-dialog'
  | 'collapse-reference'
  | 'open-leave-guard'
  | 'allow-history';

/** Resolve one System Back press to exactly one action, in the treaty's order. */
export function resolveBack(ctx: BackContext): BackAction {
  if (ctx.dialogOpen) return 'close-dialog';
  if (ctx.referenceExpanded) return 'collapse-reference';
  if (ctx.runActive) return 'open-leave-guard';
  return 'allow-history';
}

/**
 * Whether a back press at this state must be intercepted (kept inside the app)
 * rather than allowed to pop history. Everything except `allow-history` is an
 * in-app action that must re-arm the sentinel so the run is never silently left.
 */
export function backIsIntercepted(ctx: BackContext): boolean {
  return resolveBack(ctx) !== 'allow-history';
}
