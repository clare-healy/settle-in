// @vitest-environment happy-dom
//
// Expanded reference: opening/scrolling changes no teaching state (F4), a segment
// change collapses it, the compact sticky header carries the required fields, and
// authored cue content is never clipped (class contract + full-text assertions).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootApp, beginRun, zone, byId, maybeId, type Harness } from './test-support.js';
import { loadValidClass } from '../store/test-support.js';

const here = dirname(fileURLToPath(import.meta.url));

interface CtrlPeek {
  controller: { snapshot(): { currentSegmentId: string | null; expandedReferenceSegmentId: string | null }; eventLog(): { type: string }[] };
}
function peek(h: Harness): CtrlPeek {
  return h.app as unknown as CtrlPeek;
}

async function toButterfly(h: Harness): Promise<void> {
  await beginRun(h);
  await zone(h.app, h.root, 'next'); // grounding → Supported Butterfly
}

describe('expanded reference', () => {
  it('opening the reference changes no teaching state (F4)', async () => {
    const h = await bootApp();
    await toButterfly(h);
    const before = peek(h).controller.snapshot().currentSegmentId;
    const elapsedBefore = byId(h.root, 'elapsed').textContent;

    await zone(h.app, h.root, 'ref'); // open reference

    expect(maybeId(h.root, 'reference')).not.toBeNull();
    // Same segment, no new teaching-state event, elapsed/drift unmoved.
    const after = peek(h).controller.snapshot().currentSegmentId;
    expect(after).toBe(before);
    const enteredCount = peek(h).controller.eventLog().filter((e) => e.type === 'segment_entered').length;
    expect(enteredCount).toBe(2); // initial grounding + one advance; opening ref added none
    expect(byId(h.root, 'ref-elapsed').textContent).toBe(elapsedBefore);
  });

  it('a segment change collapses the reference', async () => {
    const h = await bootApp();
    await toButterfly(h);
    await zone(h.app, h.root, 'ref'); // open
    expect(maybeId(h.root, 'reference')).not.toBeNull();

    await zone(h.app, h.root, 'next'); // advance to the transition
    expect(maybeId(h.root, 'reference')).toBeNull();
    expect(peek(h).controller.snapshot().expandedReferenceSegmentId).toBeNull();
  });

  it('the sticky header carries pose, planned window, wall clock, and elapsed', async () => {
    const h = await bootApp();
    await toButterfly(h);
    await zone(h.app, h.root, 'ref');

    const header = byId(h.root, 'reference-header');
    expect(header.textContent).toContain('Supported Butterfly');
    expect(byId(h.root, 'ref-wall-clock')).toBeTruthy();
    expect(byId(h.root, 'ref-elapsed')).toBeTruthy();
    // The header is the sticky element by class contract.
    expect(header.className).toContain('reference__header');
  });

  it('renders all eight pose cue fields with full authored text and no clipping', async () => {
    const def = await loadValidClass();
    const butterfly = def.authoredSegments.find((s) => s.type === 'pose' && s.name === 'Supported Butterfly');
    const h = await bootApp();
    await toButterfly(h);
    await zone(h.app, h.root, 'ref');

    const body = byId(h.root, 'reference-body');
    const fields = body.querySelectorAll('.reference-field');
    expect(fields.length).toBeGreaterThanOrEqual(8);

    // No authored cue container carries an overflow-hidden clip (class contract:
    // the field wrapper's own rule sets overflow:visible; none set inline hidden).
    body.querySelectorAll('.reference-field, .reference-field__value').forEach((node) => {
      expect((node as HTMLElement).style.overflow).not.toBe('hidden');
    });

    // Full authored text is present, character-for-character (never truncated).
    if (butterfly && butterfly.type === 'pose') {
      expect(body.textContent).toContain(butterfly.entry);
      expect(body.textContent).toContain(butterfly.notes);
    }
  });

  it('the stylesheet scrolls the reference body and never clips cue containers', () => {
    // Class contract, read from the authored stylesheet: the reference body is a
    // scroll region and the cue field wrappers are overflow:visible — the design
    // system forbids silently clipping authored copy (§ Layout). Device/Playwright
    // verifies the resolved computed styles.
    const css = readFileSync(join(here, 'styles', 'app.css'), 'utf8');
    const body = /\.reference__body\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(body).toContain('overflow-y: auto');
    const field = /\.reference-field\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(field).toContain('overflow: visible');
    expect(field).not.toContain('overflow: hidden');
  });
});
