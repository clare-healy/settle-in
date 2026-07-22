// Library list (screen-states.md § 13).
//
// Lists authored classes by date — theme, peak pose, planned duration, taught-run
// count, and an upcoming marker — plus the backup/restore section and the § 14
// storage warning (surfaced HERE, never during a run). When more than one future
// class exists, Clare explicitly chooses which is upcoming (the deferred M4a Q3):
// each class carries a `Set as upcoming` control unless it already is.

import { el } from '../dom.js';
import { readTextFile } from '../file-input.js';
import { classDateLabel, minutesLabel } from '../format.js';
import { peakPoseName, type ClassGroup } from '../library-model.js';
import type { LibraryProps } from '../view-types.js';

export function renderLibrary(props: LibraryProps): HTMLElement {
  const { groups, upcomingClassId, ambiguousUpcoming, actions } = props;

  const head = el('div', {
    class: 'import__head',
    children: [
      el('button', {
        class: 'btn btn--quiet import__back',
        text: '‹ Back',
        attrs: { 'data-testid': 'library-back' },
        on: { click: () => actions.goHome() },
      }),
      el('h1', { class: 'class-card__title', text: 'Library' }),
    ],
  });

  const list =
    groups.length > 0
      ? el('div', {
          class: 'library__list',
          attrs: { 'data-testid': 'library-list' },
          children: groups.map((g) =>
            renderClassRow(g, g.classId === upcomingClassId, ambiguousUpcoming, actions),
          ),
        })
      : el('p', { class: 'cue', attrs: { 'data-testid': 'library-empty' }, text: 'No classes yet. Import one to begin.' });

  const importBtn = el('button', {
    class: 'btn btn--quiet',
    text: 'Import a class',
    attrs: { 'data-testid': 'library-import' },
    on: { click: () => actions.openImport() },
  });

  return el('section', {
    class: 'screen library',
    attrs: { 'data-screen': 'library' },
    children: [head, importBtn, list, el('hr', { class: 'divider' }), renderBackupRestore(props)],
  });
}

function renderClassRow(
  g: ClassGroup,
  isUpcoming: boolean,
  ambiguousUpcoming: boolean,
  actions: LibraryProps['actions'],
): HTMLElement {
  const def = g.latest.definition;
  const meta = el('div', {
    class: 'library__row-meta',
    children: [
      el('span', { class: 'tabular', text: minutesLabel(def.plannedDurationSec) }),
      el('span', { text: `Peak: ${peakPoseName(def)}` }),
      el('span', { text: `${g.runCount} taught ${g.runCount === 1 ? 'run' : 'runs'}` }),
    ],
  });

  const children: (Node | null)[] = [
    el('div', {
      class: 'library__row-head',
      children: [
        el('span', { class: 'library__row-title', text: def.title }),
        isUpcoming
          ? el('span', { class: 'library__upcoming-mark', attrs: { 'data-testid': `upcoming-${g.classId}` }, text: 'Upcoming' })
          : null,
      ],
    }),
    el('p', { class: 'library__row-date', text: classDateLabel(def.date) }),
    el('p', { class: 'library__row-theme cue', text: def.themeLine }),
    meta,
  ];

  // A `Set as upcoming` control appears when this class is not upcoming and a choice
  // is meaningful (more than one future class). Screen-states § 3.
  if (!isUpcoming && ambiguousUpcoming) {
    children.push(
      el('button', {
        class: 'btn btn--quiet library__set-upcoming',
        text: 'Set as upcoming',
        attrs: { 'data-testid': `set-upcoming-${g.classId}` },
        on: {
          click: (ev) => {
            ev.stopPropagation();
            actions.setUpcoming(g.classId);
          },
        },
      }),
    );
  }

  return el('button', {
    class: `library__row${isUpcoming ? ' library__row--upcoming' : ''}`,
    attrs: { 'data-testid': `class-${g.classId}`, 'aria-label': `Open ${def.title}` },
    on: { click: () => actions.openClassDetail(g.classId) },
    children,
  });
}

// --- Backup / restore + storage warning -------------------------------------

function renderBackupRestore(props: LibraryProps): HTMLElement {
  const { restore, storageWarning, actions } = props;

  const restoreInput = el('input', {
    attrs: { type: 'file', accept: '.json,application/json', 'data-testid': 'restore-file', hidden: 'true' },
  }) as HTMLInputElement;
  restoreInput.addEventListener('change', () => {
    void readTextFile(restoreInput, (text) => actions.restoreFileLoaded(text));
  });

  const children: (Node | null)[] = [
    el('p', { class: 'eyebrow', text: 'Backup' }),
  ];

  if (storageWarning) {
    // §14 storage warning — exact copy, library-only, never during a run.
    children.push(
      el('p', {
        class: 'library__storage-warning',
        attrs: { 'data-testid': 'storage-warning' },
        text: 'This device may clear local data. Export a backup after class.',
      }),
    );
  }

  children.push(
    el('div', {
      class: 'library__backup-actions',
      children: [
        el('button', {
          class: 'btn btn--quiet',
          text: 'Export library backup',
          attrs: { 'data-testid': 'export-backup' },
          on: { click: () => actions.exportBackup() },
        }),
        el('button', {
          class: 'btn btn--quiet',
          text: 'Restore from backup',
          attrs: { 'data-testid': 'restore-library' },
          on: { click: () => restoreInput.click() },
        }),
        restoreInput,
      ],
    }),
  );

  if (restore.phase === 'error') {
    children.push(
      el('p', {
        class: 'library__restore-error',
        attrs: { 'data-testid': 'restore-error' },
        text: restore.reason,
      }),
    );
  } else if (restore.phase === 'confirm') {
    children.push(renderRestoreConfirm(props));
  }

  return el('div', { class: 'library__backup', children });
}

function renderRestoreConfirm(props: LibraryProps): HTMLElement {
  const { restore, actions } = props;
  const counts = restore.phase === 'confirm' ? restore.counts : { classes: 0, runs: 0 };
  return el('div', {
    class: 'library__restore-confirm surface',
    attrs: { 'data-testid': 'restore-confirm' },
    children: [
      el('p', {
        class: 'cue',
        text: `This backup holds ${counts.classes} ${counts.classes === 1 ? 'class' : 'classes'} and ${counts.runs} ${counts.runs === 1 ? 'run' : 'runs'}.`,
      }),
      el('p', {
        class: 'stub',
        text: 'Merge keeps everything you already have and only adds what is new. Replace clears the library first.',
      }),
      el('div', {
        class: 'import__actions',
        children: [
          el('button', {
            class: 'btn btn--quiet',
            text: 'Cancel',
            attrs: { 'data-testid': 'restore-cancel' },
            on: { click: () => actions.dismissRestore() },
          }),
          el('button', {
            class: 'btn btn--danger',
            text: 'Replace library…',
            attrs: { 'data-testid': 'restore-replace' },
            on: { click: () => actions.requestRestoreReplace() },
          }),
          el('button', {
            class: 'btn btn--primary',
            text: 'Merge into library',
            attrs: { 'data-testid': 'restore-merge' },
            on: { click: () => actions.restoreMerge() },
          }),
        ],
      }),
    ],
  });
}
