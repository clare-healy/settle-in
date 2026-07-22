import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { MINIMAL_VALID, expectFail, messageMentions, replaceOnce } from './test-helpers.js';

// C7 — an unsupported future schema version is rejected intact, with no partial
// library write and the source preserved.

describe('unsupported future schema_version', () => {
  it('rejects schema_version: 999 with an update-required message and no partial result', async () => {
    const source = replaceOnce(MINIMAL_VALID, 'schema_version: 1', 'schema_version: 999');
    const result = expectFail(await importClass(source));

    // No partial validation: the single schema error is returned alone.
    expect(result.errors).toHaveLength(1);
    const error = result.errors[0]!;
    expect(error.field).toBe('schema_version');
    expect(messageMentions(error.message, '999', 'update')).toBe(true);

    // The source is preserved for editing or copying.
    expect(result.originalMarkdown).toBe(source);
  });
});
