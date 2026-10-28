// Overlay dialogs: the Leave Class guard and the deliberate confirmations
// (screen-states.md § 10; § destructive actions; § 9 Finish; § 11 recovery end).
//
// Leaving, abandoning, and finishing each require a deliberate confirmation;
// ordinary forward/back navigation does not. Return-to-class is always the primary,
// lowest-friction choice.

import { format12hLabel, hardCloseForScheduledStart } from '../../model/index.js';
import { el, text as textNode } from '../dom.js';
import type { AppActions, Dialog } from '../view-types.js';

export function renderDialog(dialog: Dialog, actions: AppActions): HTMLElement {
  const sheet = el('div', {
    class: 'sheet',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'data-dialog': dialog.kind },
    children: sheetChildren(dialog, actions),
  });
  return el('div', {
    class: 'scrim',
    attrs: { 'data-testid': 'scrim' },
    // Tapping the scrim is the low-risk "return" — never a destructive default.
    on: { click: (ev) => { if (ev.target === ev.currentTarget) actions.closeDialog(); } },
    children: [sheet],
  });
}

function sheetChildren(dialog: Dialog, actions: AppActions): HTMLElement[] {
  switch (dialog.kind) {
    case 'leave-guard':
      return [
        el('h2', { class: 'sheet__title', text: 'Leave class?' }),
        el('button', {
          class: 'btn btn--primary',
          text: 'Return to class',
          attrs: { 'data-testid': 'return-to-class' },
          on: { click: () => actions.closeDialog() },
        }),
        el('button', {
          class: 'btn',
          text: 'Leave open to resume later',
          attrs: { 'data-testid': 'leave-open' },
          on: { click: () => actions.leaveOpen() },
        }),
        el('button', {
          class: 'btn btn--danger',
          text: 'End this run',
          attrs: { 'data-testid': 'end-this-run' },
          on: { click: () => actions.requestEndRun() },
        }),
      ];
    case 'end-run-confirm':
      return [
        el('h2', { class: 'sheet__title', text: 'End this run?' }),
        el('p', { class: 'sheet__body', text: 'The run is kept as a record; teaching stops now.' }),
        el('button', {
          class: 'btn btn--danger',
          text: 'End run',
          attrs: { 'data-testid': 'confirm-end-run' },
          on: { click: () => actions.confirmEndRun() },
        }),
        el('button', {
          class: 'btn btn--quiet',
          text: 'Cancel',
          on: { click: () => actions.openLeaveGuard() },
        }),
      ];
    case 'finish-confirm':
      return [
        el('h2', { class: 'sheet__title', text: 'Finish class?' }),
        el('p', { class: 'sheet__body', text: 'This closes the run and opens your post-class notes.' }),
        el('button', {
          class: 'btn btn--primary',
          text: 'Finish class',
          attrs: { 'data-testid': 'confirm-finish' },
          on: { click: () => actions.confirmFinish() },
        }),
        el('button', {
          class: 'btn btn--quiet',
          text: 'Not yet',
          on: { click: () => actions.closeDialog() },
        }),
      ];
    case 'recovery-end-confirm':
      return [
        el('h2', { class: 'sheet__title', text: 'End without resuming?' }),
        el('p', { class: 'sheet__body', text: 'The run is kept as a record. You will not return to it.' }),
        el('button', {
          class: 'btn btn--danger',
          text: 'End run',
          attrs: { 'data-testid': 'confirm-end-recovery' },
          on: { click: () => actions.confirmEndRecovery() },
        }),
        el('button', {
          class: 'btn btn--quiet',
          text: 'Cancel',
          on: { click: () => actions.closeDialog() },
        }),
      ];
    case 'restore-replace-confirm':
      return [
        el('h2', { class: 'sheet__title', text: 'Replace the whole library?' }),
        el('p', {
          class: 'sheet__body',
          text: 'This clears every class and run on this device, then writes the backup in their place. This cannot be undone.',
        }),
        el('button', {
          class: 'btn btn--danger',
          text: 'Replace library',
          attrs: { 'data-testid': 'confirm-restore-replace' },
          on: { click: () => actions.confirmRestoreReplace() },
        }),
        el('button', {
          class: 'btn btn--quiet',
          text: 'Cancel',
          on: { click: () => actions.closeDialog() },
        }),
      ];
    case 'schedule-change':
      return scheduleChangeChildren(dialog, actions);
  }
}

function scheduleChangeChildren(
  dialog: Extract<Dialog, { kind: 'schedule-change' }>,
  actions: AppActions,
): HTMLElement[] {
  const input = el('input', {
    class: 'sheet__time-input tabular',
    attrs: {
      type: 'time',
      id: 'schedule-start',
      'data-testid': 'schedule-start',
      required: 'true',
      step: '60',
    },
  }) as HTMLInputElement;
  input.value = dialog.scheduledStartLocal;

  const closeValue = el('span', {
    class: 'tabular',
    attrs: { 'data-testid': 'schedule-close' },
  });
  const change = el('button', {
    class: 'btn btn--primary',
    text: 'Change Schedule',
    attrs: { 'data-testid': 'confirm-schedule-change' },
    on: { click: () => actions.changeSchedule(input.value) },
  }) as HTMLButtonElement;

  const updateClose = (): void => {
    const hardClose = hardCloseForScheduledStart(input.value);
    closeValue.textContent = hardClose ? format12hLabel(hardClose) : '—';
    change.disabled = hardClose === null;
  };
  input.addEventListener('input', updateClose);
  updateClose();

  const children: HTMLElement[] = [
    el('h2', { class: 'sheet__title', text: 'Change scheduled time' }),
    el('p', {
      class: 'sheet__body',
      text: 'This saves a new version of this class. Earlier versions and taught runs stay unchanged.',
    }),
    el('label', {
      class: 'sheet__time-label',
      attrs: { for: 'schedule-start' },
      children: [textNode('Scheduled start'), input],
    }),
    el('p', {
      class: 'sheet__calculated-close',
      children: [textNode('Hard close '), closeValue],
    }),
  ];
  if (dialog.error) {
    children.push(el('p', { class: 'sheet__error', attrs: { role: 'alert' }, text: dialog.error }));
  }
  children.push(
    el('button', {
      class: 'btn btn--quiet',
      text: 'Cancel',
      on: { click: () => actions.closeDialog() },
    }),
    change,
  );
  return children;
}
