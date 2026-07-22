// @vitest-environment happy-dom
//
// Import flow (screen-states § 2) driven through the REAL import UI + parser +
// store — no mocks. Covers the input → validating → error | confirmation states,
// the C-series acceptance criteria at the UI level (C2/C3 invalid pair, C5
// duplicate, C6 revision, C7 schema version, C8 summary, C9 warning, C10 schedule
// warning), the preserved-source contract, and Copy errors.

import { describe, it, expect } from 'vitest';
import { bootApp, byId, maybeId, tap, jul28, type Harness } from './test-support.js';
import { readFixture, replaceOnce } from '../parser/test-helpers.js';

const VALID = readFixture('valid-desire-paths.md');

/** Type source into the import field and validate it, awaiting the pipeline. */
async function validate(h: Harness, source: string): Promise<void> {
  const field = byId<HTMLTextAreaElement>(h.root, 'import-source');
  field.value = source;
  byId(h.root, 'import-validate').click();
  await h.app.idle();
}

/** Open the import screen from whatever entry screen is showing. */
async function openImport(h: Harness): Promise<void> {
  const entry = maybeId(h.root, 'import-class') ?? maybeId(h.root, 'home-import');
  if (!entry) throw new Error('no import entry button');
  entry.click();
  await h.app.idle();
}

describe('Import — confirmation summary (C8)', () => {
  it('shows the full import summary for the valid fixture, then imports and surfaces it upcoming', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    expect(h.app.routeKind).toBe('empty');
    await openImport(h);
    await validate(h, VALID);

    const summary = byId(h.root, 'import-summary');
    const text = summary.textContent ?? '';
    expect(text).toContain('Desire Paths'); // title
    expect(text).toContain('60 min'); // planned duration
    expect(text).toContain('5'); // authored poses / transitions
    expect(text).toContain('8'); // teaching sides
    expect(text).toContain('Supported Caterpillar'); // peak pose
    // Props are listed.
    expect(byId(h.root, 'import-summary').parentElement?.textContent).toContain('bolster');
    // No warnings for the clean fixture.
    expect(maybeId(h.root, 'import-warnings')).toBeNull();

    // Confirm the import → lands on Home with the class upcoming.
    byId(h.root, 'import-confirm').click();
    await h.app.idle();
    expect(h.app.routeKind).toBe('home');
    expect(byId(h.root, 'upcoming-card').textContent).toContain('Desire Paths');
  });
});

describe('Import — warning without blocking (C9)', () => {
  it('shows exactly the short-plan warning and still allows import', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    await openImport(h);
    await validate(h, readFixture('warning-short-plan.md'));

    expect(h.root.querySelector('[data-import-phase="confirm"]')).not.toBeNull();
    const warnings = byId(h.root, 'import-warnings');
    expect(warnings.querySelectorAll('li')).toHaveLength(1);
    expect(warnings.textContent?.toLowerCase()).toContain('shorter');
    // Import remains available.
    expect(maybeId(h.root, 'import-confirm')).not.toBeNull();
  });
});

describe('Import — schedule warning (C10)', () => {
  it('a non-Tuesday date warns without blocking', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    await openImport(h);
    // 2026-07-29 is a Wednesday → schedule warning, still valid.
    await validate(h, replaceOnce(VALID, 'date: 2026-07-28', 'date: 2026-07-29'));

    expect(h.root.querySelector('[data-import-phase="confirm"]')).not.toBeNull();
    expect(byId(h.root, 'import-warnings').textContent?.length).toBeGreaterThan(0);
  });
});

describe('Import — blocking errors (C2, C3) preserve the source', () => {
  it('missing duration blocks with a pose-specific message and keeps the source', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    await openImport(h);
    const source = readFixture('invalid-missing-duration.md');
    await validate(h, source);

    const errors = byId(h.root, 'import-errors');
    expect(errors.textContent?.toLowerCase()).toContain('duration_min');
    // Source preserved for editing / copying.
    expect(byId<HTMLTextAreaElement>(h.root, 'import-source').value).toBe(source);
  });

  it('bilateral duration explains it is per side', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    await openImport(h);
    await validate(h, readFixture('invalid-bilateral-duration.md'));
    expect(byId(h.root, 'import-errors').textContent?.toLowerCase()).toContain('duration_per_side_min');
  });
});

describe('Import — unsupported future schema (C7)', () => {
  it('rejects schema_version 999 with an update-required message, no write', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    await openImport(h);
    await validate(h, replaceOnce(VALID, 'schema_version: 1', 'schema_version: 999'));

    expect(byId(h.root, 'import-errors').textContent?.toLowerCase()).toContain('update');
    expect(await h.store.getAllClassRevisions()).toHaveLength(0);
  });
});

describe('Import — duplicate and revision', () => {
  it('an exact duplicate is not re-imported; it opens the existing class (C5)', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) }); // fixture already seeded
    await openImport(h);
    await validate(h, VALID);

    expect(byId(h.root, 'import-duplicate').textContent).toContain('already in the library');
    const countBefore = (await h.store.getAllClassRevisions()).length;
    byId(h.root, 'import-open-existing').click();
    await h.app.idle();
    expect(h.app.routeKind).toBe('class-detail');
    // No duplicate written.
    expect((await h.store.getAllClassRevisions()).length).toBe(countBefore);
  });

  it('changed content with the same class_id is offered as a revision (C6)', async () => {
    const h = await bootApp({ seed: true, wallEpochMs: jul28(19, 0) });
    await openImport(h);
    // Same class_id, changed cue text → different source hash.
    const changed = replaceOnce(
      VALID,
      'target: Inner thighs, groins, and the front of the pelvis.',
      'target: Inner thighs and groins only.',
    );
    await validate(h, changed);

    expect(byId(h.root, 'import-revision-notice')).toBeTruthy();
    byId(h.root, 'import-confirm').click();
    await h.app.idle();
    // Two revisions of the one class now exist.
    const revs = await h.store.getClassRevisionsByClassId('desire-paths-2026-07-28');
    expect(revs.length).toBe(2);
  });
});

describe('Import — Copy errors', () => {
  it('flips the button to Copied', async () => {
    const h = await bootApp({ seed: false, wallEpochMs: jul28(19, 0) });
    await openImport(h);
    await validate(h, readFixture('invalid-missing-duration.md'));
    await tap(h.app, h.root, 'import-copy-errors');
    expect(byId(h.root, 'import-copy-errors').textContent).toBe('Copied');
  });
});
