// Post-Class Reflection (screen-states.md § 12).
//
// ONE generous native multiline textarea and nothing to curate. Clare will not
// review a class segment by segment after teaching; what she will realistically do
// is pick up her phone, speak into Gboard voice-to-text, and say what she noticed
// (field evidence, July 25, 2026 — Q5c). So there are no per-segment rows and no
// manual Skipped/Substituted controls here.
//
// Plan-versus-actual timing is not lost: it is derived from the run's event log and
// travels in the as-taught export, which is what feeds next week's authoring. The
// app already knows the timing and never asks Clare to restate it.
//
// The field is a plain `<textarea>` — no rich editor and no keystroke interception,
// so dictation behaves exactly as the platform intends. The draft persists on every
// `input` event, not merely on `change`/blur, so a dictation interrupted by
// backgrounding, a lock, or process death is recovered intact (I1). There is no
// character limit.

import { el } from '../dom.js';
import { wallClock12h } from '../format.js';
import type { RunEvent } from '../../schema/index.js';
import type { PostClassProps } from '../view-types.js';

export function renderPostClass(props: PostClassProps): HTMLElement {
  const { def, events, draftNote, offsetMinutes, actions } = props;

  const reflection = el('textarea', {
    class: 'post__reflection',
    attrs: {
      'data-testid': 'room-note',
      placeholder: 'What did you notice? (optional)',
      'aria-label': 'Reflection on this class',
    },
  }) as HTMLTextAreaElement;
  reflection.value = draftNote;
  // Every keystroke and every dictated phrase, immediately durable.
  reflection.addEventListener('input', () => actions.saveNote(reflection.value));

  return el('section', {
    class: 'screen post',
    attrs: { 'data-screen': 'post-class' },
    children: [
      el('p', { class: 'eyebrow', text: 'After class' }),
      el('h1', { class: 'class-card__title', text: def.title }),
      el('p', {
        class: 'post__meta tabular',
        attrs: { 'data-testid': 'post-meta' },
        text: metaLine(def.date, events, offsetMinutes),
      }),
      reflection,
      el('div', {
        class: 'post__actions',
        children: [
          el('button', {
            class: 'btn btn--quiet',
            text: 'Skip and complete',
            attrs: { 'data-testid': 'skip-notes' },
            on: { click: () => actions.skipNotes() },
          }),
          el('button', {
            class: 'btn btn--primary',
            text: 'Save and complete',
            attrs: { 'data-testid': 'save-notes' },
            on: { click: () => actions.finalizeNotes() },
          }),
        ],
      }),
    ],
  });
}

/** `2026-07-28 · 7:02 PM – 7:59 PM` — the class date and the ACTUAL start/finish. */
function metaLine(classDate: string, events: readonly RunEvent[], offsetMinutes: number): string {
  const started = firstEpoch(events, 'run_started');
  const ended = lastEpoch(events, 'run_finished', 'run_abandoned');
  const start = started === null ? '—' : wallClock12h(started, offsetMinutes);
  const finish = ended === null ? '—' : wallClock12h(ended, offsetMinutes);
  return `${classDate} · ${start} – ${finish}`;
}

function firstEpoch(events: readonly RunEvent[], type: RunEvent['type']): number | null {
  for (const e of events) if (e.type === type) return e.wallEpochMs;
  return null;
}

function lastEpoch(events: readonly RunEvent[], ...types: RunEvent['type'][]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e && types.includes(e.type)) return e.wallEpochMs;
  }
  return null;
}
