// Input budgets — canonical caps from the build plan's adversarial-review
// amendments, enforced BEFORE parsing so a hostile file cannot exhaust the
// device before the parser has a chance to reject it.

import type { ValidationError } from '../schema/index.js';
import { blockingError } from './issues.js';

export const BUDGETS = {
  /** 512 KB, measured as UTF-8 bytes of the normalized source. */
  maxFileBytes: 512 * 1024,
  /** 10,000 lines of normalized source. */
  maxLines: 10_000,
  /** Nesting depth 8, measured lexically across each YAML region. */
  maxNestingDepth: 8,
  /** 5,000 YAML nodes across all YAML regions. */
  maxYamlNodes: 5_000,
  /** 8 KB per scalar, guarded as the longest single physical line. */
  maxScalarBytes: 8 * 1024,
} as const;

const utf8 = new TextEncoder();

export function byteLength(text: string): number {
  return utf8.encode(text).length;
}

/**
 * Stage-one gate on the whole normalized source. Runs before the container is
 * split, so it is genuinely pre-parse. Returns a blocking error, or null when
 * the source is within budget.
 *
 * The scalar cap is guarded here as the longest physical line: a single scalar
 * longer than the cap must occupy an over-length line, and total file size caps
 * multi-line block scalars. This keeps the check lexical and pre-parse.
 */
export function checkSourceBudgets(normalized: string): ValidationError | null {
  const bytes = byteLength(normalized);
  if (bytes > BUDGETS.maxFileBytes) {
    return blockingError(
      `This file is larger than Settle In accepts (over ${kb(BUDGETS.maxFileBytes)}). Trim the class file and import it again.`,
    );
  }

  const lines = normalized.split('\n');
  if (lines.length > BUDGETS.maxLines) {
    return blockingError(
      `This file has more lines than Settle In accepts (over ${BUDGETS.maxLines.toLocaleString()}). Trim the class file and import it again.`,
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (byteLength(line) > BUDGETS.maxScalarBytes) {
      return blockingError(
        `A single value on line ${i + 1} is too long (over ${kb(BUDGETS.maxScalarBytes)}). Shorten it and import the class again.`,
        { sourceLine: i + 1 },
      );
    }
  }

  return null;
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}
