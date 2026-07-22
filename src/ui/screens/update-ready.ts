// §14 "Application update ready" — the quiet apply-now control.
//
// Outside a run only (screen-states.md § 14): Home, first-launch, and Library show
// this when the service worker reports a waiting version. It is deliberately quiet —
// a chip, not an alarm — and applying reloads onto the new version. During a run it
// is never rendered and never applied (acceptance A5).

import { el } from '../dom.js';
import type { AppActions } from '../view-types.js';

/** Returns the update chip when an update is waiting, otherwise null (append-safe). */
export function renderUpdateReady(updateReady: boolean, actions: AppActions): HTMLElement | null {
  if (!updateReady) return null;
  return el('button', {
    class: 'btn btn--quiet update-ready',
    text: 'Update ready · apply now',
    attrs: { 'data-testid': 'update-ready' },
    on: { click: () => actions.applyUpdate() },
  });
}
