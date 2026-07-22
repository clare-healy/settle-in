// Hardened YAML parsing for a single fenced block or the front matter.
//
// Amendments (docs/build-plan.md): each block parses to an AST with the core
// schema; directives, tags, anchors, aliases, multiple documents, non-string
// keys, and non-finite numbers are rejected before conversion; duplicate keys
// block at every nesting depth. Nothing from the file is ever executed — values
// become plain data only after passing these gates.

import {
  Parser,
  parseAllDocuments,
  visit,
  isMap,
  isScalar,
  type Document,
  type Node,
} from 'yaml';
import type { ValidationError } from '../schema/index.js';
import { blockingError } from './issues.js';

export interface ParsedBlock {
  readonly value: Record<string, unknown>;
  /** Top-level key name -> 1-based source line. */
  readonly fieldLines: ReadonlyMap<string, number>;
}

export type ParseBlockResult =
  | { readonly ok: true; readonly value: ParsedBlock }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

const FORBIDDEN_TOKEN_MESSAGE: Record<string, string> = {
  directive: 'YAML directives (lines beginning with %) are not allowed in a class file.',
  anchor: 'YAML anchors (&name) are not allowed in a class file.',
  alias: 'YAML aliases (*name) are not allowed in a class file.',
  tag: 'YAML tags (for example !!str or !custom) are not allowed in a class file.',
};

export function parseHardenedYaml(
  text: string,
  startLine: number,
  label: string,
): ParseBlockResult {
  const errors: ValidationError[] = [];
  const at = (offset: number): number => offsetToSourceLine(text, offset, startLine);

  if (text.trim() === '') {
    return { ok: false, errors: [blockingError(`The "${label}" block is empty; it needs its YAML fields.`, { segment: label, sourceLine: startLine })] };
  }

  // 1. Syntactic gate: scan the concrete syntax tree for forbidden constructs.
  try {
    const parser = new Parser();
    for (const token of parser.parse(text)) {
      collectForbiddenTokens(token, errors, at, label);
    }
  } catch (err) {
    return { ok: false, errors: [blockingError(`The "${label}" block is not valid YAML: ${errorText(err)}`, { segment: label, sourceLine: startLine })] };
  }
  if (errors.length > 0) return { ok: false, errors };

  // 2. Structural parse with the core schema; reject multiple documents.
  // Aliases and anchors are already rejected by the CST scan above; the core
  // schema plus uniqueKeys handles tags, non-finite numbers, and duplicate keys.
  const docs = parseAllDocuments(text, {
    version: '1.2',
    schema: 'core',
    merge: false,
    uniqueKeys: true,
  });
  if (docs.length !== 1) {
    return { ok: false, errors: [blockingError(`The "${label}" block must contain exactly one YAML document.`, { segment: label, sourceLine: startLine })] };
  }
  const doc = docs[0] as Document.Parsed;

  for (const e of doc.errors) {
    errors.push(blockingError(`The "${label}" block has a YAML problem: ${e.message}`, { segment: label, sourceLine: at(e.pos[0]) }));
  }
  if (errors.length > 0) return { ok: false, errors };

  const contents = doc.contents;
  if (!isMap(contents)) {
    return { ok: false, errors: [blockingError(`The "${label}" block must be a set of key: value fields.`, { segment: label, sourceLine: startLine })] };
  }

  // 3. Semantic gate: non-string keys and non-finite numbers, at every depth.
  visit(contents, {
    Pair(_, pair) {
      const key = pair.key;
      if (!isScalar(key) || typeof key.value !== 'string') {
        errors.push(blockingError(`The "${label}" block has a non-text key; keys must be plain text.`, { segment: label, sourceLine: rangeLine(key, at, startLine) }));
      }
    },
    Scalar(_, scalar) {
      if (typeof scalar.value === 'number' && !Number.isFinite(scalar.value)) {
        errors.push(blockingError(`The "${label}" block has a non-finite number (such as .inf or .nan), which is not allowed.`, { segment: label, sourceLine: rangeLine(scalar, at, startLine) }));
      }
    },
  });
  if (errors.length > 0) return { ok: false, errors };

  // 4. Only now convert to plain data.
  const value = doc.toJS({ mapAsMap: false }) as Record<string, unknown>;

  const fieldLines = new Map<string, number>();
  for (const item of contents.items) {
    const key = item.key;
    if (isScalar(key) && typeof key.value === 'string') {
      fieldLines.set(key.value, rangeLine(key, at, startLine));
    }
  }

  return { ok: true, value: { value, fieldLines } };
}

interface TokenLike {
  type?: string;
  offset?: number;
  [key: string]: unknown;
}

function collectForbiddenTokens(
  token: unknown,
  errors: ValidationError[],
  at: (offset: number) => number,
  label: string,
): void {
  if (token === null || typeof token !== 'object') return;
  const t = token as TokenLike;
  if (typeof t.type === 'string' && t.type in FORBIDDEN_TOKEN_MESSAGE) {
    const message = FORBIDDEN_TOKEN_MESSAGE[t.type] as string;
    const line = typeof t.offset === 'number' ? at(t.offset) : null;
    errors.push(blockingError(message, { segment: label, sourceLine: line }));
  }
  for (const key of Object.keys(t)) {
    const v = t[key];
    if (Array.isArray(v)) {
      for (const child of v) collectForbiddenTokens(child, errors, at, label);
    } else if (v !== null && typeof v === 'object') {
      collectForbiddenTokens(v, errors, at, label);
    }
  }
}

function offsetToSourceLine(text: string, offset: number, startLine: number): number {
  let line = startLine;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

function rangeLine(node: unknown, at: (offset: number) => number, startLine: number): number {
  const range = (node as Node | null)?.range;
  return range ? at(range[0]) : startLine;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
