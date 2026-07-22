// Run Recovery (screen-states.md § 11; implementation-treaty § Recovery treaty).
//
// Appears on launch when one active run exists. Calm: class title and date, actual
// start time, last active segment and side, current wall time, Resume (primary),
// and End without resuming behind a confirmation. It does NOT auto-resume or
// request a wake lock before Clare acts.

import { el } from '../dom.js';
import { classDateLabel, wallClock12h, sideLabel } from '../format.js';
import type { RecoveryProps } from '../view-types.js';

export function renderRecovery(props: RecoveryProps): HTMLElement {
  const { snapshot, offsetMinutes, actions } = props;

  const segmentText = snapshot.lastSegmentName
    ? snapshot.side
      ? `${snapshot.lastSegmentName} · ${sideLabel(snapshot.side)}`
      : snapshot.lastSegmentName
    : 'Not yet started';

  const rows = el('dl', {
    class: 'recovery__rows',
    children: [
      row('Class', snapshot.classTitle),
      row('Date', classDateLabel(snapshot.classDate)),
      row('Started', wallClock12h(snapshot.actualStartEpochMs, offsetMinutes)),
      row('Last segment', segmentText),
      row('Now', wallClock12h(snapshot.nowEpochMs, offsetMinutes)),
    ],
  });

  return el('section', {
    class: 'screen',
    attrs: { 'data-screen': 'recovery' },
    children: [
      el('p', { class: 'eyebrow', text: 'Run in progress' }),
      el('h1', { class: 'class-card__title', text: 'Resume your class?' }),
      rows,
      el('button', {
        class: 'btn btn--primary',
        text: 'Resume class',
        attrs: { 'data-testid': 'resume' },
        on: { click: () => actions.resume() },
      }),
      el('button', {
        class: 'btn btn--quiet',
        text: 'End without resuming',
        attrs: { 'data-testid': 'end-recovery' },
        on: { click: () => actions.requestEndRecovery() },
      }),
    ],
  });
}

function row(label: string, value: string): HTMLElement {
  return el('div', {
    class: 'recovery__row',
    children: [el('dt', { text: label }), el('dd', { text: value })],
  });
}
