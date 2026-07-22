// Lexical budgets for YAML regions — nesting depth and node count.
//
// These run AFTER the (cheap, line-based) container split but BEFORE the YAML
// library ever parses a block, so a deeply nested or node-heavy block is
// rejected before it can cost anything. The measurement is lexical and
// deliberately conservative: it may over-count adversarial input, never
// under-count genuine nesting, and it must not fire on well-formed classes
// (whose real depth is about three).

import type { ValidationError } from '../schema/index.js';
import { BUDGETS } from './budgets.js';
import { blockingError } from './issues.js';

export interface YamlRegion {
  readonly text: string;
  /** 1-based source line of the region's first line. */
  readonly startLine: number;
  /** Human label for messages, e.g. `Front matter` or a heading. */
  readonly label: string;
}

export function checkYamlRegionBudgets(regions: readonly YamlRegion[]): ValidationError | null {
  let totalNodes = 0;

  for (const region of regions) {
    const lines = region.text.split('\n');
    const indentStack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] ?? '';
      const indent = leadingSpaces(raw);
      const content = raw.slice(indent);
      if (content === '' || content.startsWith('#')) continue;

      while (indentStack.length > 0 && (indentStack[indentStack.length - 1] ?? 0) > indent) {
        indentStack.pop();
      }
      if (indentStack.length === 0 || (indentStack[indentStack.length - 1] ?? -1) < indent) {
        indentStack.push(indent);
      }

      const listMarkers = leadingListMarkers(content);
      const flowDepth = maxFlowDepth(content);
      const depth = indentStack.length + listMarkers + flowDepth;

      if (depth > BUDGETS.maxNestingDepth) {
        return blockingError(
          `The ${region.label} block is nested more deeply than Settle In accepts (over ${BUDGETS.maxNestingDepth} levels).`,
          { segment: region.label, sourceLine: region.startLine + i },
        );
      }

      totalNodes += 1 + flowCommaCount(content);
      if (totalNodes > BUDGETS.maxYamlNodes) {
        return blockingError(
          `This class file defines more values than Settle In accepts (over ${BUDGETS.maxYamlNodes.toLocaleString()}).`,
          { segment: region.label, sourceLine: region.startLine + i },
        );
      }
    }
  }

  return null;
}

function leadingSpaces(line: string): number {
  let n = 0;
  while (n < line.length && line[n] === ' ') n++;
  return n;
}

/** Count nested leading `- ` sequence markers (handles `- - x`). */
function leadingListMarkers(content: string): number {
  let s = content;
  let n = 0;
  while (true) {
    if (s === '-') {
      n += 1;
      break;
    }
    if (s.startsWith('- ')) {
      n += 1;
      s = s.slice(2).replace(/^ +/, '');
      continue;
    }
    break;
  }
  return n;
}

/** Maximum running depth of flow collections (`[` / `{`) on a line, ignoring quotes. */
function maxFlowDepth(content: string): number {
  let depth = 0;
  let max = 0;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '[' || c === '{') {
      depth += 1;
      if (depth > max) max = depth;
    } else if (c === ']' || c === '}') {
      if (depth > 0) depth -= 1;
    }
  }
  return max;
}

/** Count commas outside quotes — a proxy for flow-collection entries. */
function flowCommaCount(content: string): number {
  let count = 0;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === ',') count += 1;
  }
  return count;
}
