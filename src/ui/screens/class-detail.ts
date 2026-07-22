// Class detail (screen-states.md § 13).
//
// Shows the immutable authored plan, the revision identity, and each taught run as
// a separate record. Actions: `Run this class again` (a new run via the existing
// machine — routes to Prep for this class), export the original Markdown (per
// revision), and export a selected as-taught run. The plan is read-only here; no
// control on this screen can mutate a stored class definition (H5).

import { el } from '../dom.js';
import { classDateLabel, minutesLabel, sideLabel } from '../format.js';
import { format12hLabel } from '../../model/index.js';
import { peakPoseName } from '../library-model.js';
import type { ClassDetailProps, RunRow } from '../view-types.js';
import type { RunStateKind } from '../../schema/index.js';

const STATUS_LABEL: Record<RunStateKind, string> = {
  no_active_run: 'not started',
  active_run: 'in progress',
  finished_run_pending_notes: 'finished · notes pending',
  completed_run: 'completed',
  abandoned_run: 'ended early',
};

export function renderClassDetail(props: ClassDetailProps): HTMLElement {
  const { group, isUpcoming, runs, actions } = props;
  const def = group.latest.definition;

  const head = el('div', {
    class: 'import__head',
    children: [
      el('button', {
        class: 'btn btn--quiet import__back',
        text: '‹ Library',
        attrs: { 'data-testid': 'detail-back' },
        on: { click: () => actions.openLibrary() },
      }),
      el('h1', { class: 'class-card__title', text: def.title }),
    ],
  });

  const meta = el('div', {
    children: [
      el('p', { class: 'class-card__meta', text: classDateLabel(def.date) }),
      el('p', { class: 'class-card__theme', text: def.themeLine }),
      isUpcoming
        ? el('span', { class: 'library__upcoming-mark', attrs: { 'data-testid': 'detail-upcoming' }, text: 'Upcoming' })
        : null,
      el('p', {
        class: 'stub',
        children: [
          document.createTextNode(`Peak: ${peakPoseName(def)} · Planned `),
          el('span', { class: 'tabular', text: minutesLabel(def.plannedDurationSec) }),
          document.createTextNode(' · Hard close '),
          el('span', { class: 'tabular', text: format12hLabel(def.hardCloseLocal) }),
        ],
      }),
    ],
  });

  const primary = el('div', {
    class: 'library__backup-actions',
    children: [
      el('button', {
        class: 'btn btn--primary',
        text: 'Run this class again',
        attrs: { 'data-testid': 'run-again' },
        on: { click: () => actions.runClassAgain(group.classId) },
      }),
    ],
  });

  return el('section', {
    class: 'screen library',
    attrs: { 'data-screen': 'class-detail', 'data-class-id': group.classId },
    children: [
      head,
      meta,
      primary,
      section('Plan', renderPlan(props)),
      section('Revisions', renderRevisions(props)),
      section('Taught runs', renderRuns(runs, actions)),
    ],
  });
}

function renderPlan(props: ClassDetailProps): HTMLElement {
  const def = props.group.latest.definition;
  const rows = def.expandedRuntimeSegments.map((seg) => {
    const isPeak = seg.parentId === def.peakPoseId;
    const name = seg.side ? `${seg.name} · ${sideLabel(seg.side)}` : seg.name;
    return el('div', {
      class: `prep__sequence-row${isPeak ? ' prep__sequence-row--peak' : ''}`,
      children: [
        el('span', { class: 'prep__sequence-name', text: name }),
        el('span', { class: 'prep__sequence-window tabular', text: minutesLabel(seg.plannedDurationSec) }),
      ],
    });
  });
  return el('div', { attrs: { 'data-testid': 'detail-plan' }, children: rows });
}

function renderRevisions(props: ClassDetailProps): HTMLElement {
  const { group, actions } = props;
  return el('div', {
    class: 'detail__revisions',
    children: group.revisions.map((rev) =>
      el('div', {
        class: 'detail__revision',
        attrs: { 'data-testid': `revision-${rev.sourceHash}` },
        children: [
          el('div', {
            class: 'detail__revision-id',
            children: [
              el('span', { class: 'tabular', text: shortHash(rev.sourceHash) }),
              el('span', { class: 'stub', text: ` imported ${classDateLabel(rev.importedAt.slice(0, 10))}` }),
            ],
          }),
          el('button', {
            class: 'btn btn--quiet',
            text: 'Export original Markdown',
            attrs: { 'data-testid': `export-original-${rev.sourceHash}` },
            on: { click: () => actions.exportOriginal(rev.sourceHash) },
          }),
        ],
      }),
    ),
  });
}

function renderRuns(runs: readonly RunRow[], actions: ClassDetailProps['actions']): HTMLElement {
  if (runs.length === 0) {
    return el('p', { class: 'cue', attrs: { 'data-testid': 'detail-no-runs' }, text: 'No taught runs yet.' });
  }
  return el('div', {
    class: 'detail__runs',
    attrs: { 'data-testid': 'detail-runs' },
    children: runs.map((run) =>
      el('div', {
        class: 'detail__run',
        attrs: { 'data-testid': `run-${run.runId}` },
        children: [
          el('div', {
            class: 'detail__run-meta',
            children: [
              el('span', { text: classDateLabel(run.runLocalDate) }),
              el('span', { class: 'stub', text: STATUS_LABEL[run.status] }),
            ],
          }),
          el('button', {
            class: 'btn btn--quiet',
            text: 'Export as taught',
            attrs: { 'data-testid': `export-run-${run.runId}` },
            on: { click: () => actions.exportAsTaughtRun(run.runId) },
          }),
        ],
      }),
    ),
  });
}

function section(label: string, body: Node): HTMLElement {
  return el('div', {
    class: 'detail__section',
    children: [el('p', { class: 'eyebrow prep__section-label', text: label }), body],
  });
}

/** A short, glanceable prefix of the source hash for revision identity display. */
function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
}
