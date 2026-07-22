// Original class Markdown export.
//
// docs/implementation-treaty.md § Export: "Original class Markdown" is the
// byte-exact stored source. The normalized ClassDefinition carries the imported
// Markdown verbatim (schema/index.ts ClassDefinition.originalMarkdown), captured
// at import before any newline normalization touched the hash input — so this is
// a passthrough, never a re-serialization.

import type { ClassDefinition } from '../schema/index.js';

/** The byte-exact original Markdown stored for a class revision. */
export function exportOriginalMarkdown(definition: ClassDefinition): string {
  return definition.originalMarkdown;
}
