// Prep (screen-states.md § 4).
//
// Shows, in exact order: title/date/theme/felt sense, the preflight line, props,
// room setup, arrival, breathwork, the full side-aware sequence with planned times
// and the peak marker, the hard close, and Begin Class (always reachable, never
// clipped). A quiet Display Options disclosure toggles the next-pose preview
// (default on); it is not reachable during the run.

import { el, text as textNode } from '../dom.js';
import { classDateLabel, plannedWindowLabel, sideLabel } from '../format.js';
import { format12hLabel, reanchorPlan } from '../../model/index.js';
import type { PrepProps } from '../view-types.js';

const PREFLIGHT = 'Do Not Disturb on · brightness set · battery comfortable';

export function renderPrep(props: PrepProps): HTMLElement {
  const { def, runStartedPreviewEpochMs, offsetMinutes, prefs, actions } = props;

  const scroll = el('div', { class: 'prep__scroll' });

  // Title, date, theme, felt sense.
  scroll.appendChild(
    el('div', {
      children: [
        el('h1', { class: 'class-card__title', text: def.title }),
        el('p', { class: 'class-card__meta', text: classDateLabel(def.date) }),
        el('p', { class: 'class-card__theme', text: def.themeLine }),
        el('p', { class: 'cue', text: def.feltSense }),
      ],
    }),
  );

  // Preflight.
  scroll.appendChild(el('p', { class: 'prep__preflight', text: PREFLIGHT }));

  // Props.
  scroll.appendChild(section('Props', list(def.props)));
  // Room setup (may be empty).
  if (def.roomSetup.length > 0) {
    scroll.appendChild(section('Room setup', list(def.roomSetup)));
  }
  // Arrival.
  scroll.appendChild(section('Arrival', el('p', { class: 'cue', text: def.arrival })));
  // Breathwork.
  scroll.appendChild(section('Breathwork', el('p', { class: 'cue', text: def.breathwork })));

  // Full side-aware sequence with planned times and peak marker.
  scroll.appendChild(section('Sequence', renderSequence(props)));

  // Hard close.
  scroll.appendChild(
    el('p', {
      class: 'prep__hardclose',
      children: [
        textNode('Hard close '),
        el('span', { class: 'tabular', text: format12hLabel(def.hardCloseLocal) }),
      ],
    }),
  );

  // Display Options disclosure.
  scroll.appendChild(renderDisplayOptions(prefs.nextPosePreview, actions));

  const begin = el('div', {
    class: 'prep__begin',
    children: [
      el('button', {
        class: 'btn btn--primary',
        text: 'Begin Class',
        attrs: { 'data-testid': 'begin-class' },
        on: { click: () => actions.beginClass() },
      }),
    ],
  });

  // runStartedPreviewEpochMs is used inside renderSequence; keep the binding read.
  void runStartedPreviewEpochMs;
  void offsetMinutes;

  return el('section', {
    class: 'screen prep',
    attrs: { 'data-screen': 'prep' },
    children: [scroll, begin],
  });
}

function renderSequence(props: PrepProps): HTMLElement {
  const { def, runStartedPreviewEpochMs, offsetMinutes } = props;
  const windows = reanchorPlan(def.expandedRuntimeSegments, runStartedPreviewEpochMs);
  const container = el('div');

  def.expandedRuntimeSegments.forEach((seg, i) => {
    const window = windows[i];
    const isPeak = seg.parentId === def.peakPoseId;
    const nameText = seg.side ? `${seg.name} · ${sideLabel(seg.side)}` : seg.name;
    const nameChildren: (Node | null)[] = [
      el('span', { class: 'prep__sequence-name', text: nameText }),
    ];
    if (isPeak) {
      nameChildren.push(el('span', { class: 'prep__peak-mark', text: ' Peak' }));
    }
    container.appendChild(
      el('div', {
        class: `prep__sequence-row${isPeak ? ' prep__sequence-row--peak' : ''}`,
        children: [
          el('span', { children: nameChildren }),
          el('span', {
            class: 'prep__sequence-window tabular',
            text: window
              ? plannedWindowLabel(window.plannedStartEpochMs, window.plannedEndEpochMs, offsetMinutes)
              : '',
          }),
        ],
      }),
    );
  });

  return container;
}

function renderDisplayOptions(nextPosePreview: boolean, actions: PrepProps['actions']): HTMLElement {
  const checkbox = el('input', {
    attrs: { type: 'checkbox', id: 'pref-next-pose', 'data-testid': 'pref-next-pose' },
  });
  checkbox.checked = nextPosePreview;
  checkbox.addEventListener('change', () => actions.setNextPosePreview(checkbox.checked));

  return el('details', {
    class: 'disclosure',
    children: [
      el('summary', { text: 'Display Options' }),
      el('label', {
        class: 'display-option',
        attrs: { for: 'pref-next-pose' },
        children: [checkbox, textNode('Show the next-pose preview during class')],
      }),
    ],
  });
}

function section(label: string, body: Node): HTMLElement {
  return el('div', {
    children: [
      el('p', { class: 'eyebrow prep__section-label', text: label }),
      body,
    ],
  });
}

function list(items: readonly string[]): HTMLElement {
  return el('ul', {
    children: items.map((item) => el('li', { class: 'cue', text: item })),
  });
}
