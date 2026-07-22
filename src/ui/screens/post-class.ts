// Post-Class Notes (screen-states.md § 12).
//
// Rows are DERIVED from the run's event log via the model's deriveActuals — Clare
// is never asked to restate timing the app already knows (I1). She may correct a
// segment to Skipped, mark Substituted with a short name, add one room note, and
// Save or Skip — both complete the run. Corrections write the run record only;
// they never mutate the immutable class definition (H5 — enforced by the store's
// put-if-absent class API, exercised here through RunController.skip/substitute).

import { el } from '../dom.js';
import { sideLabel } from '../format.js';
import { deriveActuals, formatElapsed, type SegmentActual, type SegmentStatus } from '../../model/index.js';
import type { PostClassProps } from '../view-types.js';

const STATUS_TEXT: Record<SegmentStatus, string> = {
  skipped: 'skipped',
  substituted: 'substituted',
  revisited: 'revisited',
  long: 'long',
  short: 'short',
  'on-plan': 'on plan',
};

export function renderPostClass(props: PostClassProps): HTMLElement {
  const { def, events, draftNote, actions } = props;
  const actuals = deriveActuals(def, events);

  const scroll = el('div', {
    class: 'post__scroll',
    children: actuals.map((row) => renderRow(row, actions)),
  });

  const note = el('textarea', {
    class: 'post__note-field',
    attrs: {
      'data-testid': 'room-note',
      placeholder: 'One room note (optional)',
      'aria-label': 'Room note',
    },
  }) as HTMLTextAreaElement;
  note.value = draftNote;
  note.addEventListener('change', () => actions.saveNote(note.value));

  return el('section', {
    class: 'screen',
    attrs: { 'data-screen': 'post-class' },
    children: [
      el('p', { class: 'eyebrow', text: 'After class' }),
      el('h1', { class: 'class-card__title', text: 'How it ran' }),
      scroll,
      note,
      el('div', {
        class: 'post__actions',
        children: [
          el('button', {
            class: 'btn btn--quiet',
            text: 'Skip notes',
            attrs: { 'data-testid': 'skip-notes' },
            on: { click: () => actions.skipNotes() },
          }),
          el('button', {
            class: 'btn btn--primary',
            text: 'Save & complete',
            attrs: { 'data-testid': 'save-notes' },
            on: { click: () => actions.finalizeNotes() },
          }),
        ],
      }),
    ],
  });
}

function renderRow(row: SegmentActual, actions: PostClassProps['actions']): HTMLElement {
  const nameText = row.side ? `${row.name} · ${sideLabel(row.side)}` : row.name;
  const subLabelName = nameText;
  const statusText = row.substitutedWith
    ? `substituted → ${row.substitutedWith}`
    : STATUS_TEXT[row.status];

  const subInput = el('input', {
    class: 'post__sub-input',
    attrs: {
      type: 'text',
      'aria-label': `Substitute name for ${subLabelName}`,
      placeholder: 'Substitute',
      maxlength: '60',
    },
  }) as HTMLInputElement;

  const controls = el('div', {
    class: 'post__row-controls',
    children: [
      el('button', {
        class: 'btn btn--quiet',
        text: 'Mark skipped',
        attrs: { 'data-testid': `skip-${row.id}` },
        on: { click: () => actions.correctSkip(row.id) },
      }),
      subInput,
      el('button', {
        class: 'btn btn--quiet',
        text: 'Substitute',
        attrs: { 'data-testid': `substitute-${row.id}` },
        on: {
          click: () => {
            const name = subInput.value.trim();
            if (name.length > 0) actions.correctSubstitute(row.id, name);
          },
        },
      }),
    ],
  });

  return el('div', {
    class: 'post__row',
    attrs: { 'data-testid': `actual-${row.id}` },
    children: [
      el('span', { class: 'post__row-name', text: nameText }),
      el('span', {
        class: 'post__row-times tabular',
        text: `${formatElapsed(row.plannedSec)} / ${formatElapsed(row.actualSec)}`,
      }),
      el('span', { class: 'post__row-status', attrs: { 'data-testid': `status-${row.id}` }, text: statusText }),
      controls,
    ],
  });
}
