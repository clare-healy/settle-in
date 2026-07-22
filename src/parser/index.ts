// The import pipeline — a pure (async, for hashing) function of a string.
//
// Order matters and follows docs/implementation-treaty.md § Import and the build
// plan's amendments:
//   1. NUL / budget gates on the raw and normalized source, before any parsing.
//   2. Newline + BOM normalization and source_hash (Web Crypto).
//   3. Total-grammar container split.
//   4. Per-YAML-region lexical budgets (depth, node count), before YAML parsing.
//   5. Hardened YAML parse of the front matter and every block.
//   6. Normalization into ClassDefinition and full validation.
//
// Nothing from the file is executed; imported content only ever becomes plain
// data or DOM text.

import type { ImportResult, ValidationError } from '../schema/index.js';
import { checkSourceBudgets } from './budgets.js';
import { splitContainer } from './container.js';
import { blockingError } from './issues.js';
import { containsNul, normalizeSource, sourceHash } from './normalize-source.js';
import { normalizeAndValidate } from './validate.js';
import { parseHardenedYaml, type ParsedBlock } from './yaml-block.js';
import { checkYamlRegionBudgets, type YamlRegion } from './yaml-budgets.js';

export async function importClass(input: string): Promise<ImportResult> {
  const originalMarkdown = input;

  if (containsNul(input)) {
    return fail([blockingError('This file contains a NUL byte and cannot be read as a text class file.')], null, originalMarkdown);
  }

  const normalized = normalizeSource(input);

  const budgetError = checkSourceBudgets(normalized);
  if (budgetError) {
    return fail([budgetError], null, originalMarkdown);
  }

  const hash = await sourceHash(normalized);

  const split = splitContainer(normalized);
  if (!split.ok) {
    return fail([split.error], hash, originalMarkdown);
  }

  const regions: YamlRegion[] = [
    { text: split.value.frontMatterText, startLine: split.value.frontMatterStartLine, label: 'Front matter' },
    ...split.value.blocks.map((b) => ({ text: b.yamlText, startLine: b.yamlStartLine, label: b.headingText })),
  ];
  const regionBudgetError = checkYamlRegionBudgets(regions);
  if (regionBudgetError) {
    return fail([regionBudgetError], hash, originalMarkdown);
  }

  const parseErrors: ValidationError[] = [];
  const frontMatterParsed = parseHardenedYaml(split.value.frontMatterText, split.value.frontMatterStartLine, 'Front matter');
  let frontMatter: ParsedBlock | null = null;
  if (frontMatterParsed.ok) {
    frontMatter = frontMatterParsed.value;
  } else {
    parseErrors.push(...frontMatterParsed.errors);
  }

  const segments: { split: (typeof split.value.blocks)[number]; parsed: ParsedBlock }[] = [];
  for (const block of split.value.blocks) {
    const parsed = parseHardenedYaml(block.yamlText, block.yamlStartLine, block.headingText);
    if (parsed.ok) {
      segments.push({ split: block, parsed: parsed.value });
    } else {
      parseErrors.push(...parsed.errors);
    }
  }

  if (parseErrors.length > 0 || frontMatter === null) {
    return fail(parseErrors, hash, originalMarkdown);
  }

  const result = normalizeAndValidate({
    h1Title: split.value.title,
    frontMatter,
    frontMatterStartLine: split.value.frontMatterStartLine,
    segments,
    sourceHash: hash,
    originalMarkdown,
  });

  if (result.classDefinition && result.summary) {
    return {
      ok: true,
      classDefinition: result.classDefinition,
      warnings: result.warnings,
      summary: result.summary,
      originalMarkdown,
    };
  }

  return {
    ok: false,
    errors: result.errors,
    warnings: result.warnings,
    sourceHash: hash,
    originalMarkdown,
  };
}

function fail(errors: readonly ValidationError[], hash: string | null, originalMarkdown: string): ImportResult {
  return { ok: false, errors, warnings: [], sourceHash: hash, originalMarkdown };
}

export { importClass as default };
