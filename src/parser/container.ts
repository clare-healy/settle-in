// Container splitter — a total grammar over the class file.
//
// The class format is not general Markdown. It is exactly:
//
//   YAML front matter (--- ... ---)
//   one H1 whose text matches the front-matter title
//   a run of (## heading) each immediately followed by exactly one ```yaml block
//
// Every line must be consumed. Stray prose, a second H1, a fence with no heading,
// a second fence under one heading, an unclosed fence, and trailing content are
// all rejected with a plain-language message that names the source line. YAML
// offsets are mapped back to source lines by the recorded per-block start line.

import type { ValidationError } from '../schema/index.js';
import { blockingError } from './issues.js';

const FENCE = '```';

export interface SplitBlock {
  /** Heading text after `## `, e.g. `Grounding` or `Pose: Supported Butterfly`. */
  readonly headingText: string;
  /** 1-based source line of the `## ...` heading. */
  readonly headingLine: number;
  /** YAML content between the fences (fences excluded). */
  readonly yamlText: string;
  /** 1-based source line of the first YAML content line. */
  readonly yamlStartLine: number;
}

export interface SplitResult {
  readonly frontMatterText: string;
  /** 1-based source line of the first front-matter content line. */
  readonly frontMatterStartLine: number;
  readonly title: string;
  readonly h1Line: number;
  readonly blocks: readonly SplitBlock[];
}

export type ContainerResult =
  | { readonly ok: true; readonly value: SplitResult }
  | { readonly ok: false; readonly error: ValidationError };

const isBlank = (line: string): boolean => line.trim() === '';
const isH1 = (line: string): boolean => /^#(?!#)\s+\S/.test(line);
const isH2 = (line: string): boolean => /^##(?!#)\s+\S/.test(line);
const isFenceOpen = (line: string): boolean =>
  line.startsWith(FENCE) && line.slice(FENCE.length).trim() === 'yaml';
const isFenceClose = (line: string): boolean =>
  line.startsWith(FENCE) && line.slice(FENCE.length).trim() === '';
const headingContent = (line: string): string => line.replace(/^#+\s+/, '').trim();

export function splitContainer(normalized: string): ContainerResult {
  const lines = normalized.split('\n');
  let i = 0;

  const nextNonBlank = (from: number): number => {
    let j = from;
    while (j < lines.length && isBlank(lines[j] ?? '')) j++;
    return j;
  };

  const fail = (message: string, line?: number): ContainerResult => ({
    ok: false,
    error: blockingError(message, line === undefined ? {} : { sourceLine: line }),
  });

  // --- Front matter ---------------------------------------------------------
  i = nextNonBlank(0);
  if (i >= lines.length || (lines[i] ?? '').trim() !== '---') {
    return fail('This file needs a YAML front-matter block at the top, opened with a line containing only ---.');
  }
  const frontMatterStartLine = i + 2; // 1-based line after the opening ---
  i += 1;
  const frontMatterLines: string[] = [];
  let frontMatterClosed = false;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '---') {
      frontMatterClosed = true;
      i += 1;
      break;
    }
    frontMatterLines.push(line);
    i += 1;
  }
  if (!frontMatterClosed) {
    return fail('The front-matter block was opened with --- but never closed with a matching --- line.');
  }

  // --- H1 title -------------------------------------------------------------
  i = nextNonBlank(i);
  if (i >= lines.length) {
    return fail('This file is missing its H1 title line (# Class Title) after the front matter.');
  }
  const h1Raw = lines[i] ?? '';
  if (!isH1(h1Raw)) {
    return fail(
      'The line after the front matter must be the H1 title (a single # followed by the class title).',
      i + 1,
    );
  }
  const title = headingContent(h1Raw);
  const h1Line = i + 1;
  i += 1;

  // --- Segments -------------------------------------------------------------
  const blocks: SplitBlock[] = [];
  while (true) {
    i = nextNonBlank(i);
    if (i >= lines.length) break; // clean end: only blank lines remain

    const line = lines[i] ?? '';

    if (isH1(line)) {
      return fail('Only one H1 title is allowed. Remove the extra # heading.', i + 1);
    }
    if (isFenceOpen(line)) {
      return fail('A ```yaml block appeared without its own ## heading above it.', i + 1);
    }
    if (!isH2(line)) {
      return fail(`Unexpected text outside a segment: "${truncate(line.trim())}"`, i + 1);
    }

    // A segment heading.
    const headingText = headingContent(line);
    const headingLine = i + 1;
    i += 1;

    // Exactly one ```yaml fence must follow.
    i = nextNonBlank(i);
    if (i >= lines.length || !isFenceOpen(lines[i] ?? '')) {
      return fail(`The "${headingText}" heading must be followed by one ${FENCE}yaml block.`, headingLine);
    }
    const yamlStartLine = i + 2; // 1-based first content line after the opener
    i += 1;

    const yamlLines: string[] = [];
    let fenceClosed = false;
    while (i < lines.length) {
      const yLine = lines[i] ?? '';
      if (isFenceClose(yLine)) {
        fenceClosed = true;
        i += 1;
        break;
      }
      yamlLines.push(yLine);
      i += 1;
    }
    if (!fenceClosed) {
      return fail(`The ${FENCE}yaml block under "${headingText}" was opened but never closed.`, headingLine);
    }

    blocks.push({
      headingText,
      headingLine,
      yamlText: yamlLines.join('\n'),
      yamlStartLine,
    });
  }

  return {
    ok: true,
    value: { frontMatterText: frontMatterLines.join('\n'), frontMatterStartLine, title, h1Line, blocks },
  };
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
