// Home / upcoming class (screen-states.md § 3).
//
// Minimal for M4a: the upcoming class card (title, date, theme line, planned
// duration, hard close) and Open Prep. Import and Library are visually present
// but inert stubs labeled for M5. If an active run existed, the controller routes
// to Run Recovery instead of Home — so this screen assumes no active run.

import { el } from '../dom.js';
import { classDateLabel, minutesLabel } from '../format.js';
import { format12hLabel } from '../../model/index.js';
import type { HomeProps } from '../view-types.js';

export function renderHome(props: HomeProps): HTMLElement {
  const { upcoming, actions } = props;

  const brand = el('div', {
    class: 'home__brand',
    children: [
      el('span', { class: 'home__name', text: 'Settle In' }),
      el('span', { class: 'home__purpose', text: 'Your quiet class reference' }),
    ],
  });

  const children: (Node | null)[] = [brand];

  if (upcoming) {
    children.push(renderCard(upcoming, actions));
  } else {
    children.push(
      el('p', {
        class: 'loading-copy',
        text: 'No class imported yet.',
      }),
    );
  }

  // Import and Library access (screen-states § 3).
  children.push(
    el('div', {
      class: 'home__secondary',
      children: [
        el('button', {
          class: 'btn btn--quiet',
          text: 'Import a class',
          attrs: { 'data-testid': 'home-import' },
          on: { click: () => actions.openImport() },
        }),
        el('button', {
          class: 'btn btn--quiet',
          text: 'Library',
          attrs: { 'data-testid': 'home-library' },
          on: { click: () => actions.openLibrary() },
        }),
      ],
    }),
    el('p', {
      class: 'backup-status',
      text: 'Local backup: manage in Library after class.',
    }),
  );

  return el('section', {
    class: 'screen',
    attrs: { 'data-screen': 'home' },
    children,
  });
}

function renderCard(def: HomeProps['upcoming'] & object, actions: HomeProps['actions']): HTMLElement {
  return el('div', {
    class: 'surface',
    attrs: { 'data-testid': 'upcoming-card' },
    children: [
      el('h1', { class: 'class-card__title', text: def.title }),
      el('p', { class: 'class-card__meta', text: classDateLabel(def.date) }),
      el('p', { class: 'class-card__theme', text: def.themeLine }),
      el('div', {
        class: 'class-card__timing',
        children: [
          el('span', {
            children: [
              document.createTextNode('Planned '),
              el('span', { class: 'tabular', text: minutesLabel(def.plannedDurationSec) }),
            ],
          }),
          el('span', {
            children: [
              document.createTextNode('Hard close '),
              el('span', { class: 'tabular', text: format12hLabel(def.hardCloseLocal) }),
            ],
          }),
        ],
      }),
      el('button', {
        class: 'btn btn--primary',
        text: 'Open Prep',
        attrs: { 'data-testid': 'open-prep' },
        on: { click: () => actions.openPrep() },
      }),
    ],
  });
}
