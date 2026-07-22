// Shared helpers for the M4a DOM tests. Not a *.test.ts file, so Vitest does not
// collect it as a suite. Tests set `// @vitest-environment happy-dom` in their
// docblock; this module drives the REAL router + RunController + store
// (fake-indexeddb) with the valid fixture and a TestClock — no mocks of the
// timing model or persistence.

import { TestClock } from '../model/index.js';
import { Store } from '../store/index.js';
import { AppController } from './app.js';
import {
  CDT_OFFSET_MIN,
  jul28,
  loadValidClass,
  newDbName,
  revisionOf,
} from '../store/test-support.js';

export { CDT_OFFSET_MIN, jul28 };

export interface Harness {
  readonly app: AppController;
  readonly clock: TestClock;
  readonly store: Store;
  readonly root: HTMLElement;
}

/** Boot the app over a fresh fake-indexeddb, optionally seeded with the fixture.
 * Pass an existing `store` to simulate a reload / process death against the same
 * durable state (a new executionId then models a fresh JS execution). */
export async function bootApp(opts: {
  wallEpochMs?: number;
  seed?: boolean;
  executionId?: string;
  store?: Store;
} = {}): Promise<Harness> {
  const store = opts.store ?? (await Store.open({ name: newDbName() }));
  if (!opts.store && opts.seed !== false) {
    const def = await loadValidClass();
    await store.putClassRevision(revisionOf(def));
  }
  const clock = new TestClock({
    wallEpochMs: opts.wallEpochMs ?? jul28(19, 0),
    monotonic: 0,
    offsetMinutes: CDT_OFFSET_MIN,
    executionId: opts.executionId ?? 'exec-1',
  });
  const root = document.createElement('div');
  document.body.appendChild(root);
  const app = await AppController.boot({
    store,
    root,
    clock,
    offsetMinutes: CDT_OFFSET_MIN,
    executionId: clock.executionId,
  });
  return { app, clock, store, root };
}

/** Query one element by test id within a root; throws if absent. */
export function byId<T extends HTMLElement = HTMLElement>(root: ParentNode, testid: string): T {
  const node = root.querySelector<T>(`[data-testid="${testid}"]`);
  if (!node) throw new Error(`no element with data-testid="${testid}"`);
  return node;
}

/** Optional query by test id (null when absent). */
export function maybeId<T extends HTMLElement = HTMLElement>(root: ParentNode, testid: string): T | null {
  return root.querySelector<T>(`[data-testid="${testid}"]`);
}

/** Click a test-id element, then await all in-flight dispatched actions. */
export async function tap(app: AppController, root: ParentNode, testid: string): Promise<void> {
  byId(root, testid).click();
  await app.idle();
}

/** Activate a live tap zone (`prev` | `ref` | `next`), then await settling. */
export async function zone(app: AppController, root: ParentNode, which: 'prev' | 'ref' | 'next'): Promise<void> {
  const node = root.querySelector<HTMLButtonElement>(`[data-zone="${which}"]`);
  if (!node) throw new Error(`no [data-zone="${which}"] on the live surface`);
  node.click();
  await app.idle();
}

/** Begin a class from Home (opens Prep, taps Begin), leaving the app in the run. */
export async function beginRun(h: Harness): Promise<void> {
  await tap(h.app, h.root, 'open-prep');
  await tap(h.app, h.root, 'begin-class');
}

/** Advance forward n runtime segments via the Next zone. */
export async function advanceSegments(h: Harness, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await zone(h.app, h.root, 'next');
  }
}

/** Set the clock (both hands) to an absolute wall instant and re-render live. */
export function setWall(h: Harness, epochMs: number): void {
  const delta = epochMs - h.clock.now().getTime();
  h.clock.advance(delta);
}
