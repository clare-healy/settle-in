// Overlay dialogs: the Leave Class guard and the deliberate confirmations
// (screen-states.md § 10; § destructive actions; § 9 Finish; § 11 recovery end).
//
// Leaving, abandoning, and finishing each require a deliberate confirmation;
// ordinary forward/back navigation does not. Return-to-class is always the primary,
// lowest-friction choice.

import { el } from '../dom.js';
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
  }
}
