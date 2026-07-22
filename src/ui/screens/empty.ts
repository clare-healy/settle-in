// First launch / empty library (screen-states.md § 1).
//
// Purpose: get the first authored class into the app. Shows the app name and a
// one-line purpose, an `Import a class` primary action, a `Restore library backup`
// secondary action (a file picker), and a quiet offline-install status placeholder
// (real service-worker status arrives at M6). No sample classes are shown as if
// they were Clare's history. A restore chosen here is validated by the controller,
// which routes to the Library to show its confirmation or error.

import { el } from '../dom.js';
import { readTextFile } from '../file-input.js';
import type { EmptyProps } from '../view-types.js';

export function renderEmpty(props: EmptyProps): HTMLElement {
  const { actions } = props;

  const restoreInput = el('input', {
    attrs: { type: 'file', accept: '.json,application/json', 'data-testid': 'restore-file', hidden: 'true' },
  }) as HTMLInputElement;
  restoreInput.addEventListener('change', () => {
    void readTextFile(restoreInput, (text) => actions.restoreFileLoaded(text));
  });

  return el('section', {
    class: 'screen empty',
    attrs: { 'data-screen': 'empty' },
    children: [
      el('div', {
        class: 'empty__brand',
        children: [
          el('h1', { class: 'class-card__title', text: 'Settle In' }),
          el('p', { class: 'home__purpose', text: 'Your quiet class reference.' }),
        ],
      }),
      el('p', { class: 'cue empty__lede', text: 'Import your first authored class to begin.' }),
      el('div', {
        class: 'empty__actions',
        children: [
          el('button', {
            class: 'btn btn--primary',
            text: 'Import a class',
            attrs: { 'data-testid': 'import-class' },
            on: { click: () => actions.openImport() },
          }),
          el('button', {
            class: 'btn btn--quiet',
            text: 'Restore library backup',
            attrs: { 'data-testid': 'restore-library' },
            on: { click: () => restoreInput.click() },
          }),
          restoreInput,
        ],
      }),
      el('p', {
        class: 'backup-status',
        attrs: { 'data-testid': 'install-status' },
        text: 'Offline install: available after the first save.',
      }),
    ],
  });
}
