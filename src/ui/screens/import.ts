// Import (screen-states.md § 2), replacing the M4a stub.
//
// The screen is a small state machine (view-types ImportView): input → validating
// → error | confirmation (new / revision / duplicate). No content is saved until
// Clare confirms. Errors use warm contrast, text, and structure — never red alone
// (design-system) — and always preserve the source so it can be edited or copied
// back to the authoring assistant. Imported source is only ever placed as text
// (dom.ts is textContent-only); nothing from the file is executed.

import { el } from '../dom.js';
import { readTextFile } from '../file-input.js';
import { classDateLabel, minutesLabel } from '../format.js';
import { format12hLabel } from '../../model/index.js';
import type { ImportProps } from '../view-types.js';
import type { ImportSummary, ValidationError, Warning } from '../../schema/index.js';

const SCHEMA_EXAMPLE = [
  '---',
  'schema_version: 1',
  'class_id: your-class-2026-07-28',
  'title: Your Class',
  'date: 2026-07-28',
  'scheduled_start_local: "19:00"',
  'hard_close_local: "20:00"',
  'theme_line: One line of theme.',
  'felt_sense: One line of felt sense.',
  'peak_pose_id: supported-caterpillar',
  'props:',
  '  - 1 bolster per person',
  'room_setup: []',
  'arrival: How the room arrives.',
  'breathwork: The breath cue.',
  '---',
  '',
  '# Your Class',
  '',
  '## Grounding',
  '',
  '```yaml',
  'id: grounding',
  'duration_min: 10',
  '# … theme_anchor, three yin_principles, guided_silent_ratio',
  '```',
  '',
  '## Pose: Supported Caterpillar',
  '',
  '```yaml',
  'id: supported-caterpillar',
  'bilateral: false',
  'duration_min: 6',
  '# … entry, target, settling, midpoint, props, alternative, exit, notes',
  '```',
  '',
  '## Savasana',
  '',
  '```yaml',
  'id: savasana',
  'duration_min: 15',
  '# … six steps, wake_message',
  '```',
].join('\n');

export function renderImport(props: ImportProps): HTMLElement {
  const { view, actions } = props;
  const children: (Node | null)[] = [
    el('div', {
      class: 'import__head',
      children: [
        el('button', {
          class: 'btn btn--quiet import__back',
          text: '‹ Back',
          attrs: { 'data-testid': 'import-back' },
          on: { click: () => actions.goHome() },
        }),
        el('h1', { class: 'class-card__title', text: 'Import a class' }),
      ],
    }),
  ];

  switch (view.phase) {
    case 'input':
      children.push(renderInput(view.source, actions));
      break;
    case 'validating':
      children.push(
        el('p', { class: 'loading-copy', attrs: { 'data-testid': 'import-validating' }, text: 'Checking class…' }),
      );
      break;
    case 'error':
      children.push(renderError(view.source, view.errors, view.copied, actions));
      break;
    case 'confirm':
      children.push(renderConfirm(view.kind, view.summary, view.warnings, actions));
      break;
    case 'duplicate':
      children.push(renderDuplicate(view.existingClassId, actions));
      break;
  }

  return el('section', {
    class: 'screen import',
    attrs: { 'data-screen': 'import', 'data-import-phase': view.phase },
    children,
  });
}

// --- Input state ------------------------------------------------------------

function renderInput(source: string, actions: ImportProps['actions']): HTMLElement {
  const field = el('textarea', {
    class: 'import__field',
    attrs: {
      'data-testid': 'import-source',
      'aria-label': 'Class Markdown',
      placeholder: 'Paste the class Markdown here…',
      spellcheck: 'false',
    },
  }) as HTMLTextAreaElement;
  field.value = source;

  const fileInput = el('input', {
    attrs: { type: 'file', accept: '.md,text/markdown,text/plain', 'data-testid': 'import-file', hidden: 'true' },
  }) as HTMLInputElement;
  fileInput.addEventListener('change', () => {
    void readTextFile(fileInput, (docText) => actions.importFileLoaded(docText));
  });

  return el('div', {
    class: 'import__body',
    children: [
      field,
      el('div', {
        class: 'import__actions',
        children: [
          el('button', {
            class: 'btn btn--quiet',
            text: 'Choose Markdown file',
            attrs: { 'data-testid': 'import-choose-file' },
            on: { click: () => fileInput.click() },
          }),
          fileInput,
          el('button', {
            class: 'btn btn--primary',
            text: 'Validate class',
            attrs: { 'data-testid': 'import-validate' },
            on: { click: () => actions.importValidate(field.value) },
          }),
        ],
      }),
      renderSchemaExample(),
    ],
  });
}

function renderSchemaExample(): HTMLElement {
  return el('details', {
    class: 'disclosure import__example',
    children: [
      el('summary', { text: 'Show a schema-v1 example', attrs: { 'data-testid': 'import-example-toggle' } }),
      // Text only — imported/example content is never executed as HTML.
      el('pre', { class: 'import__example-code', attrs: { 'data-testid': 'import-example' }, text: SCHEMA_EXAMPLE }),
    ],
  });
}

// --- Blocking-error state ---------------------------------------------------

function renderError(
  source: string,
  errors: readonly ValidationError[],
  copied: boolean,
  actions: ImportProps['actions'],
): HTMLElement {
  const rows = el('ul', {
    class: 'import__errors',
    attrs: { 'data-testid': 'import-errors' },
    children: errors.map((e) => renderErrorRow(e)),
  });

  const preserved = el('textarea', {
    class: 'import__field import__field--preserved',
    attrs: { 'data-testid': 'import-source', 'aria-label': 'Class Markdown (preserved)', readonly: 'true' },
  }) as HTMLTextAreaElement;
  preserved.value = source;

  return el('div', {
    class: 'import__body',
    children: [
      el('p', {
        class: 'import__summary-line',
        text: `This class can’t be imported yet — ${errors.length} ${errors.length === 1 ? 'thing' : 'things'} to fix.`,
      }),
      rows,
      el('div', {
        class: 'import__actions',
        children: [
          el('button', {
            class: 'btn btn--quiet',
            text: copied ? 'Copied' : 'Copy errors',
            attrs: { 'data-testid': 'import-copy-errors' },
            on: { click: () => actions.importCopyErrors() },
          }),
          el('button', {
            class: 'btn btn--primary',
            text: 'Check again',
            attrs: { 'data-testid': 'import-check-again' },
            on: { click: () => actions.importCheckAgain() },
          }),
        ],
      }),
      el('p', { class: 'eyebrow', text: 'Your source, preserved' }),
      preserved,
    ],
  });
}

function renderErrorRow(e: ValidationError): HTMLElement {
  const locus: string[] = [];
  if (e.segment) locus.push(e.segment);
  if (e.field) locus.push(e.field);
  if (e.sourceLine !== null) locus.push(`line ${e.sourceLine}`);
  const children: Node[] = [];
  if (locus.length > 0) {
    children.push(el('span', { class: 'import__error-locus', text: locus.join(' · ') }));
  }
  children.push(el('span', { class: 'import__error-message', text: e.message }));
  return el('li', { class: 'import__error-row', children });
}

// --- Confirmation state (new / revision) ------------------------------------

function renderConfirm(
  kind: 'new' | 'revision',
  summary: ImportSummary,
  warnings: readonly Warning[],
  actions: ImportProps['actions'],
): HTMLElement {
  const children: (Node | null)[] = [];

  if (kind === 'revision') {
    children.push(
      el('p', {
        class: 'import__notice',
        attrs: { 'data-testid': 'import-revision-notice' },
        text: 'A class with this id is already in your library. Importing keeps every past run and adds this as a new revision.',
      }),
    );
  }

  children.push(renderSummary(summary));

  if (warnings.length > 0) {
    children.push(
      el('div', {
        class: 'import__warnings',
        attrs: { 'data-testid': 'import-warnings' },
        children: [
          el('p', { class: 'eyebrow', text: `${warnings.length} warning${warnings.length === 1 ? '' : 's'}` }),
          el('ul', {
            children: warnings.map((w) => el('li', { class: 'import__warning', text: w.message })),
          }),
        ],
      }),
    );
  }

  children.push(
    el('div', {
      class: 'import__actions',
      children: [
        el('button', {
          class: 'btn btn--quiet',
          text: 'Return to source',
          attrs: { 'data-testid': 'import-return' },
          on: { click: () => actions.importReturnToSource() },
        }),
        el('button', {
          class: 'btn btn--primary',
          text: 'Import class',
          attrs: { 'data-testid': 'import-confirm' },
          on: { click: () => actions.importConfirm() },
        }),
      ],
    }),
  );

  return el('div', { class: 'import__body', children });
}

/** The full import summary required by class-format.md § Import summary. */
function renderSummary(s: ImportSummary): HTMLElement {
  const rows: [string, string][] = [
    ['Title', s.title],
    ['Date', classDateLabel(s.date)],
    ['Scheduled start', format12hLabel(s.scheduledStartLocal)],
    ['Hard close', format12hLabel(s.hardCloseLocal)],
    ['Planned duration', minutesLabel(s.plannedDurationSec)],
    ['Authored poses', String(s.authoredPoseCount)],
    ['Teaching sides', String(s.teachingSideCount)],
    ['Transitions', String(s.transitionCount)],
    ['Savasana', minutesLabel(s.savasanaDurationSec)],
    ['Peak pose', s.peakPoseName],
    ['Warnings', String(s.warningCount)],
  ];

  const dl = el('dl', {
    class: 'import__summary',
    attrs: { 'data-testid': 'import-summary' },
    children: rows.flatMap(([label, value]) => [
      el('dt', { text: label }),
      el('dd', { text: value }),
    ]),
  });

  const props = el('div', {
    class: 'import__summary-block',
    children: [
      el('p', { class: 'eyebrow', text: 'Props' }),
      el('ul', { children: s.props.map((p) => el('li', { class: 'cue', text: p })) }),
    ],
  });

  const roomChildren: Node[] = [el('p', { class: 'eyebrow', text: 'Room setup' })];
  roomChildren.push(
    s.roomSetup.length > 0
      ? el('ul', { children: s.roomSetup.map((r) => el('li', { class: 'cue', text: r })) })
      : el('p', { class: 'cue', text: 'None noted.' }),
  );
  const room = el('div', { class: 'import__summary-block', children: roomChildren });

  return el('div', { children: [dl, props, room] });
}

// --- Duplicate state --------------------------------------------------------

function renderDuplicate(existingClassId: string, actions: ImportProps['actions']): HTMLElement {
  return el('div', {
    class: 'import__body',
    children: [
      el('p', {
        class: 'import__notice',
        attrs: { 'data-testid': 'import-duplicate' },
        text: 'This exact class is already in the library.',
      }),
      el('div', {
        class: 'import__actions',
        children: [
          el('button', {
            class: 'btn btn--quiet',
            text: 'Return to source',
            attrs: { 'data-testid': 'import-return' },
            on: { click: () => actions.importReturnToSource() },
          }),
          el('button', {
            class: 'btn btn--primary',
            text: 'Open existing class',
            attrs: { 'data-testid': 'import-open-existing' },
            on: { click: () => actions.importOpenExisting(existingClassId) },
          }),
        ],
      }),
    ],
  });
}
