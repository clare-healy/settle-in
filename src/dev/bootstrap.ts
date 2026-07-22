// Dev-only library seed.
//
// Imported ONLY behind `import.meta.env.DEV` (see src/main.ts), so this module and
// its `?raw` fixture import are tree-shaken out of the production build — no
// fixture content ships. It runs the real parser into the real store when the
// library is empty, so `npm run dev` opens on a real upcoming class.

import validFixture from '../../fixtures/valid-desire-paths.md?raw';
import { importClass } from '../parser/index.js';
import { Store } from '../store/index.js';
import type { StoredClassRevision } from '../store/index.js';

export async function seedDevLibrary(store: Store): Promise<void> {
  // The Playwright import/first-launch spec pins an empty library by setting this
  // flag before boot, so the real Import UI can be driven from a true empty state.
  // Dev-only (this whole module is behind import.meta.env.DEV), so it never ships.
  if (typeof localStorage !== 'undefined' && localStorage.getItem('__settleInNoSeed') === '1') return;

  const existing = await store.getAllClassRevisions();
  if (existing.length > 0) return;

  const result = await importClass(validFixture);
  if (!result.ok) {
    if (typeof console !== 'undefined') {
      console.warn('[settle-in dev] fixture failed to import:', result.errors);
    }
    return;
  }

  const revision: StoredClassRevision = {
    sourceHash: result.classDefinition.sourceHash,
    classId: result.classDefinition.classId,
    schemaVersion: result.classDefinition.schemaVersion,
    warnings: result.warnings,
    importedAt: new Date().toISOString(),
    definition: result.classDefinition,
  };
  await store.putClassRevision(revision);
}
