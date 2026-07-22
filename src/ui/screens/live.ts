// The live teaching surface: Grounding, Pose, Transition, Savasana, plus the
// expanded reference and the two-minute wake callout.
//
// Every value is recomputed from durable timestamps through src/model — never
// reimplemented timing math (implementation-treaty § Time model). The screen is
// built once per structural change; per-second ticks call the returned handle's
// update(), which refreshes only the time-dependent text nodes in place so scroll
// position and focus in the expanded reference are never reset (F4). Tap zones map
// Previous 20% / Reference 60% / Next 20% (screen-states § Live-run tap map); all
// actions flow through the controller, and a rejected `busy` result is silently
// ignored by the controller layer.

import { el, text as textNode } from '../dom.js';
import {
  currentDriftDisplay,
  deriveWakeState,
  elapsedSec,
  formatElapsed,
  plannedWindowFor,
  type DriftDisplay,
} from '../../model/index.js';
import type {
  AuthoredSavasana,
  EventSample,
  ExpandedSegment,
  RunEvent,
} from '../../schema/index.js';
import { plannedWindowLabel, sideLabel, wallClock12h } from '../format.js';
import type { LiveHandle, LiveProps } from '../view-types.js';

type Updater = (now: EventSample) => void;

export function renderLive(props: LiveProps): LiveHandle {
  const seg = props.snapshot.currentSegment;
  const updaters: Updater[] = [];

  const container = el('div', {
    class: 'live',
    attrs: { 'data-screen': 'live', 'data-segment-type': seg ? seg.type : 'none' },
  });

  if (!seg) {
    // Defensive: a run with no current segment cannot occur after Begin, but the
    // surface stays calm rather than throwing.
    container.appendChild(el('div', { class: 'live-content', children: [el('p', { class: 'loading-copy', text: 'Opening…' })] }));
    return { root: container, update: () => {} };
  }

  const entry = entrySample(props.events, seg.id);
  const drift = currentDriftDisplay(props.def, props.events, props.runStartedAtEpochMs);

  if (props.referenceOpen && (seg.type === 'pose' || seg.type === 'grounding')) {
    container.appendChild(referencePanel(props, seg, updaters, entry));
    container.appendChild(sideZones(props));
  } else {
    container.appendChild(zonesLayer(props, seg));
    container.appendChild(liveContent(props, seg, entry, drift, updaters));
  }

  // Wake callout outside Savasana: a quiet, non-obscuring lower callout.
  if (props.snapshot.currentSegment?.type !== 'savasana') {
    const wake = wakeCallout(props);
    if (wake) container.appendChild(wake);
  }

  // Quiet wake-lock indicator, only when unavailable (screen-states § 14).
  if (!props.wakeLock.available) {
    container.appendChild(
      el('button', {
        class: 'wake-lock-indicator',
        text: 'Screen may sleep · tap to retry',
        attrs: { 'data-testid': 'wake-lock-retry' },
        on: { click: () => props.actions.retryWakeLock() },
      }),
    );
  }

  const update: Updater = (now) => {
    for (const u of updaters) u(now);
  };
  update(props.now);
  return { root: container, update };
}

// --- Tap zones --------------------------------------------------------------

function zonesLayer(props: LiveProps, seg: ExpandedSegment): HTMLElement {
  const index = segmentIndex(props, seg.id);
  const refAvailable = seg.type === 'pose' || seg.type === 'grounding';

  const prev = zone('prev', 'Previous segment', '‹', index <= 0, () => props.actions.previous());

  const ref = zone(
    'ref',
    refAvailable ? 'Open reference' : 'Reference',
    null,
    !refAvailable,
    () => props.actions.toggleReference(),
  );
  if (refAvailable) {
    ref.appendChild(el('span', { class: 'zone__ref-hint', text: 'Reference' }));
  }

  const next = zone('next', 'Next segment', '›', false, () => props.actions.next());

  return el('div', { class: 'zones', children: [prev, ref, next] });
}

// Prev/Next only, for the expanded reference state.
function sideZones(props: LiveProps): HTMLElement {
  const index = segmentIndex(props, props.snapshot.currentSegmentId ?? '');
  const prev = zone('prev', 'Previous segment', '‹', index <= 0, () => props.actions.previous());
  const next = zone('next', 'Next segment', '›', false, () => props.actions.next());
  const spacer = el('div', { class: 'zone zone--ref', attrs: { 'aria-hidden': 'true' } });
  return el('div', { class: 'zones', children: [prev, spacer, next] });
}

function zone(
  which: 'prev' | 'ref' | 'next',
  label: string,
  chevron: string | null,
  disabled: boolean,
  onActivate: () => void,
): HTMLButtonElement {
  const btn = el('button', {
    class: `zone zone--${which}`,
    attrs: { 'data-zone': which, 'aria-label': label },
    on: { click: () => { if (!disabled) onActivate(); } },
  });
  if (disabled) btn.setAttribute('disabled', 'true');
  if (chevron) btn.appendChild(el('span', { class: 'zone__chevron', attrs: { 'aria-hidden': 'true' }, text: chevron }));
  return btn;
}

// --- Live content (minimal) -------------------------------------------------

function liveContent(
  props: LiveProps,
  seg: ExpandedSegment,
  entry: EventSample | null,
  drift: DriftDisplay | null,
  updaters: Updater[],
): HTMLElement {
  switch (seg.type) {
    case 'grounding':
      return groundingContent(props, seg, entry, drift, updaters);
    case 'transition':
      return transitionContent(props, seg, entry, drift, updaters);
    case 'savasana':
      return savasanaContent(props, seg, updaters);
    case 'pose':
    default:
      return poseContent(props, seg, entry, drift, updaters);
  }
}

function poseContent(
  props: LiveProps,
  seg: ExpandedSegment,
  entry: EventSample | null,
  drift: DriftDisplay | null,
  updaters: Updater[],
): HTMLElement {
  const nameChildren: (Node | null)[] = [textNode(seg.name)];
  const children: (Node | null)[] = [
    el('div', {
      children: [
        el('p', { class: 'pose-name', children: nameChildren }),
        seg.side ? el('p', { class: 'pose-side', text: sideLabel(seg.side) }) : null,
      ],
    }),
    wallClockNode(props, seg, updaters),
    timingBlock(props, seg, entry, updaters),
    driftNode(drift),
    midpointNode(seg),
    nextPoserPreview(props, seg),
  ];
  return el('div', { class: 'live-content', children });
}

function groundingContent(
  props: LiveProps,
  seg: ExpandedSegment,
  entry: EventSample | null,
  drift: DriftDisplay | null,
  updaters: Updater[],
): HTMLElement {
  const anchor = typeof seg.cues['themeAnchor'] === 'string' ? (seg.cues['themeAnchor'] as string) : '';
  return el('div', {
    class: 'live-content',
    children: [
      el('p', { class: 'segment-label eyebrow', text: 'Grounding' }),
      wallClockNode(props, seg, updaters),
      timingBlock(props, seg, entry, updaters),
      driftNode(drift),
      el('p', { class: 'midpoint', text: anchor }),
      nextPoserPreview(props, seg),
    ],
  });
}

function transitionContent(
  props: LiveProps,
  seg: ExpandedSegment,
  entry: EventSample | null,
  drift: DriftDisplay | null,
  updaters: Updater[],
): HTMLElement {
  const setup = typeof seg.cues['setup'] === 'string' ? (seg.cues['setup'] as string) : '';
  const altOffer = typeof seg.cues['alternativeOffer'] === 'string' ? (seg.cues['alternativeOffer'] as string) : '';
  return el('div', {
    class: 'live-content',
    children: [
      el('p', { class: 'segment-label eyebrow', text: 'Transition' }),
      destinationPreview(props, seg),
      wallClockNode(props, seg, updaters),
      timingBlock(props, seg, entry, updaters),
      driftNode(drift),
      setup ? el('p', { class: 'midpoint', text: setup }) : null,
      altOffer
        ? el('p', {
            class: 'next-preview',
            children: [el('span', { class: 'next-preview__label', text: 'Offer' }), textNode(altOffer)],
          })
        : null,
    ] as (Node | null)[],
  });
}

function savasanaContent(props: LiveProps, seg: ExpandedSegment, updaters: Updater[]): HTMLElement {
  const steps = Array.isArray(seg.cues['steps']) ? (seg.cues['steps'] as readonly string[]) : [];
  const activeStep = props.snapshot.savasanaStep;

  const stepList = el('ol', {
    class: 'savasana__steps',
    children: steps.map((label, i) => {
      const cls =
        i < activeStep ? 'savasana__step savasana__step--past'
          : i === activeStep ? 'savasana__step savasana__step--active'
            : 'savasana__step savasana__step--future';
      return el('li', {
        class: cls,
        attrs: { 'data-step': String(i), ...(i === activeStep ? { 'data-active': 'true' } : {}) },
        children: [
          el('span', { class: 'savasana__marker', attrs: { 'aria-hidden': 'true' } }),
          el('span', { text: label }),
        ],
      });
    }),
  });

  const closeLine = el('p', { class: 'savasana__close-line', attrs: { 'data-testid': 'savasana-close' } });
  updaters.push((now) => setSavasanaCloseLine(closeLine, props, now));

  const children: (Node | null)[] = [
    el('p', { class: 'segment-label eyebrow', text: 'Savasana' }),
    wallClockNode(props, seg, updaters, true),
    stepList,
    closeLine,
  ];

  // Two-minute message: dedicated lower area within Savasana.
  const wake = wakeCallout(props, true);
  if (wake) children.push(wake);

  // After the final step, Next has exposed Finish (never a silent finish).
  const atLastStep = steps.length > 0 && activeStep >= steps.length - 1;
  if (atLastStep && props.finishArmed) {
    children.push(
      el('button', {
        class: 'btn btn--primary savasana__finish',
        text: 'Finish Class',
        attrs: { 'data-testid': 'finish-class' },
        on: { click: () => props.actions.requestFinish() },
      }),
    );
  }

  return el('div', { class: 'live-content', children });
}

// --- Shared content pieces --------------------------------------------------

function wallClockNode(
  props: LiveProps,
  _seg: ExpandedSegment,
  updaters: Updater[],
  savasana = false,
): HTMLElement {
  const node = el('div', {
    class: `wall-clock tabular${savasana ? ' wall-clock--savasana' : ''}`,
    attrs: { 'data-testid': 'wall-clock', 'aria-label': 'Current time' },
  });
  updaters.push((now) => {
    node.textContent = wallClock12h(now.wallEpochMs, props.offsetMinutes);
  });
  return node;
}

function timingBlock(
  props: LiveProps,
  seg: ExpandedSegment,
  entry: EventSample | null,
  updaters: Updater[],
): HTMLElement {
  const window = plannedWindowFor(props.def.expandedRuntimeSegments, seg.id, props.runStartedAtEpochMs);
  const plannedText = window
    ? plannedWindowLabel(window.plannedStartEpochMs, window.plannedEndEpochMs, props.offsetMinutes)
    : '';

  const plannedNode = el('span', { class: 'planned-window tabular', text: plannedText });
  const elapsedNode = el('span', { class: 'elapsed tabular', attrs: { 'data-testid': 'elapsed' } });
  updaters.push((now) => {
    elapsedNode.textContent = entry ? formatElapsed(elapsedSec(entry, now)) : '0:00';
  });

  return el('div', {
    class: 'timing-line',
    children: [
      el('span', {
        children: [
          el('span', { class: 'next-preview__label', text: 'Planned' }),
          plannedNode,
        ],
      }),
      el('span', {
        children: [
          el('span', { class: 'next-preview__label', text: 'Elapsed' }),
          elapsedNode,
        ],
      }),
    ],
  });
}

function driftNode(drift: DriftDisplay | null): HTMLElement {
  if (!drift) {
    return el('span', { class: 'drift drift--value tabular', attrs: { 'data-testid': 'drift' }, text: 'on plan' });
  }
  if (drift.kind === 'revisited') {
    return el('span', {
      class: 'drift drift--revisited',
      attrs: { 'data-testid': 'drift', 'data-revisited': 'true' },
      text: 'revisited',
    });
  }
  return el('span', {
    class: 'drift drift--value tabular',
    attrs: { 'data-testid': 'drift' },
    text: drift.text,
  });
}

function midpointNode(seg: ExpandedSegment): HTMLElement | null {
  const midpoint = typeof seg.cues['midpoint'] === 'string' ? (seg.cues['midpoint'] as string) : '';
  if (!midpoint) return null;
  return el('p', { class: 'midpoint', attrs: { 'data-testid': 'midpoint' }, text: midpoint });
}

// Next authored POSE preview (honors the Side-2 rule: for Side 1 the next pose IS
// Side 2, so naming the next expanded pose never implies Side 2 is being skipped).
function nextPoserPreview(props: LiveProps, seg: ExpandedSegment): HTMLElement | null {
  if (!props.prefs.nextPosePreview) return null;
  const next = nextPoseSegment(props, seg.id);
  if (!next) return null;
  return el('p', {
    class: 'next-preview',
    attrs: { 'data-testid': 'next-preview' },
    children: [
      el('span', { class: 'next-preview__label', text: 'Next' }),
      textNode(next.side ? `${next.name} · ${sideLabel(next.side)}` : next.name),
      textNode('  '),
      el('span', { class: 'tabular', text: nextStartLabel(props, next.id) }),
    ],
  });
}

// The transition's quiet destination preview (the pose or Savasana it leads to).
function destinationPreview(props: LiveProps, seg: ExpandedSegment): HTMLElement | null {
  const idx = segmentIndex(props, seg.id);
  const dest = props.def.expandedRuntimeSegments[idx + 1];
  if (!dest) return null;
  return el('p', {
    class: 'next-preview',
    attrs: { 'data-testid': 'destination-preview' },
    children: [
      el('span', { class: 'next-preview__label', text: 'To' }),
      textNode(dest.side ? `${dest.name} · ${sideLabel(dest.side)}` : dest.name),
    ],
  });
}

// --- Expanded reference -----------------------------------------------------

function referencePanel(
  props: LiveProps,
  seg: ExpandedSegment,
  updaters: Updater[],
  entry: EventSample | null,
): HTMLElement {
  const window = plannedWindowFor(props.def.expandedRuntimeSegments, seg.id, props.runStartedAtEpochMs);
  const plannedText = window
    ? plannedWindowLabel(window.plannedStartEpochMs, window.plannedEndEpochMs, props.offsetMinutes)
    : '';

  const clock = el('span', { class: 'wall-clock tabular', attrs: { 'data-testid': 'ref-wall-clock' } });
  const elapsed = el('span', { class: 'elapsed tabular', attrs: { 'data-testid': 'ref-elapsed' } });
  updaters.push((now) => {
    clock.textContent = wallClock12h(now.wallEpochMs, props.offsetMinutes);
    elapsed.textContent = entry ? formatElapsed(elapsedSec(entry, now)) : '0:00';
  });

  const header = el('div', {
    class: 'reference__header',
    attrs: { 'data-testid': 'reference-header' },
    children: [
      el('div', {
        class: 'reference__header-main',
        children: [
          el('span', {
            class: 'pose-name',
            text: seg.side ? `${seg.name} · ${sideLabel(seg.side)}` : seg.name,
          }),
          el('span', { class: 'planned-window tabular', text: plannedText }),
        ],
      }),
      el('div', {
        children: [clock, el('div', { children: [elapsed] })],
      }),
    ],
  });

  const body = el('div', {
    class: 'reference__body',
    attrs: { 'data-testid': 'reference-body' },
    children: seg.type === 'pose' ? poseFields(seg) : groundingFields(props, seg),
  });

  const close = el('div', {
    class: 'reference__close',
    children: [
      el('button', {
        class: 'btn',
        text: 'Close reference',
        attrs: { 'data-testid': 'close-reference' },
        on: { click: () => props.actions.closeReference() },
      }),
    ],
  });

  return el('div', {
    class: 'reference',
    attrs: { 'data-testid': 'reference' },
    children: [header, body, close],
  });
}

const POSE_FIELD_ORDER: readonly { key: string; label: string }[] = [
  { key: 'entry', label: 'Entry' },
  { key: 'target', label: 'Target' },
  { key: 'settling', label: 'Settling' },
  { key: 'midpoint', label: 'Midpoint' },
  { key: 'props', label: 'Props and setup' },
  { key: 'alternative', label: 'Functional alternative' },
  { key: 'exit', label: 'Exit' },
  { key: 'notes', label: 'Instructor note' },
];

function poseFields(seg: ExpandedSegment): HTMLElement[] {
  return POSE_FIELD_ORDER.map(({ key, label }) => {
    const value = typeof seg.cues[key] === 'string' ? (seg.cues[key] as string) : '';
    return referenceField(label, value);
  });
}

function groundingFields(props: LiveProps, seg: ExpandedSegment): HTMLElement[] {
  const fields: HTMLElement[] = [];
  const principles = Array.isArray(seg.cues['yinPrinciples']) ? (seg.cues['yinPrinciples'] as readonly string[]) : [];
  if (principles.length > 0) {
    fields.push(
      el('div', {
        class: 'reference-field',
        children: [
          el('p', { class: 'eyebrow reference-field__label', text: 'Yin principles' }),
          el('ul', {
            children: principles.map((p) =>
              el('li', { class: 'reference-field__value', text: p }),
            ),
          }),
        ],
      }),
    );
  }
  const ratio = typeof seg.cues['guidedSilentRatio'] === 'string' ? (seg.cues['guidedSilentRatio'] as string) : '';
  fields.push(referenceField('Guided / silent', ratio));
  fields.push(referenceField('Arrival', props.def.arrival));
  fields.push(referenceField('Breathwork', props.def.breathwork));
  return fields;
}

function referenceField(label: string, value: string): HTMLElement {
  return el('div', {
    class: 'reference-field',
    attrs: { 'data-testid': `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}` },
    children: [
      el('p', { class: 'eyebrow reference-field__label', text: label }),
      el('p', { class: 'reference-field__value', text: value }),
    ],
  });
}

// --- Wake callout -----------------------------------------------------------

function wakeCallout(props: LiveProps, savasana = false): HTMLElement | null {
  const wake = deriveWakeState(props.now.wallEpochMs, props.hardCloseAtEpochMs, props.hardCloseLocal, props.events);
  if (!wake.wakeMessageVisible) return null;
  const message = authoredWakeMessage(props);
  if (!message) return null;

  const classes = ['wake-callout'];
  classes.push(savasana ? 'wake-callout--savasana' : 'wake-callout--lower');
  if (props.wakeFade) classes.push('wake-callout--fade');

  return el('p', {
    class: classes.join(' '),
    attrs: { 'data-testid': 'wake-callout', role: 'status' },
    text: message,
  });
}

function authoredWakeMessage(props: LiveProps): string {
  const sav = props.def.authoredSegments.find((s): s is AuthoredSavasana => s.type === 'savasana');
  return sav ? sav.wakeMessage : '';
}

function setSavasanaCloseLine(node: HTMLElement, props: LiveProps, now: EventSample): void {
  const wake = deriveWakeState(now.wallEpochMs, props.hardCloseAtEpochMs, props.hardCloseLocal, props.events);
  if (wake.atHardClose && wake.hardCloseIndicator) {
    node.textContent = '';
    node.appendChild(el('span', { class: 'savasana__hardclose', text: wake.hardCloseIndicator }));
    return;
  }
  // Time to hard close, never negative, until 8:00.
  const remainingMs = Math.max(0, props.hardCloseAtEpochMs - now.wallEpochMs);
  const remainingSec = Math.floor(remainingMs / 1000);
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  node.textContent = `${m}:${s < 10 ? '0' : ''}${s} to hard close`;
}

function nextStartLabel(props: LiveProps, segmentId: string): string {
  const window = plannedWindowFor(props.def.expandedRuntimeSegments, segmentId, props.runStartedAtEpochMs);
  return window ? wallClock12h(window.plannedStartEpochMs, props.offsetMinutes) : '';
}

// --- Segment helpers --------------------------------------------------------

function segmentIndex(props: LiveProps, segmentId: string): number {
  return props.def.expandedRuntimeSegments.findIndex((s) => s.id === segmentId);
}

function nextPoseSegment(props: LiveProps, segmentId: string): ExpandedSegment | null {
  const idx = segmentIndex(props, segmentId);
  for (let i = idx + 1; i < props.def.expandedRuntimeSegments.length; i++) {
    const s = props.def.expandedRuntimeSegments[i];
    if (s && s.type === 'pose') return s;
  }
  return null;
}

function entrySample(events: readonly RunEvent[], segmentId: string): EventSample | null {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const e = ordered[i];
    if (e && e.type === 'segment_entered' && e.segmentId === segmentId) {
      return { wall: e.wall, wallEpochMs: e.wallEpochMs, monotonic: e.monotonic, executionId: e.executionId };
    }
  }
  return null;
}
