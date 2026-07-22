// Build plugin: compile the hand-written service worker and audit the precache.
//
// After Vite has written the full production bundle to dist/ (including the copied
// public/ assets), this plugin:
//
//   1. Walks dist/ and builds the precache manifest — every emitted asset except
//      the service worker itself and any source maps, as scope-relative paths.
//   2. Derives a content-hash cache version so the version bumps whenever ANY shell
//      byte changes (Vite fingerprints JS/CSS/font filenames; icons, the manifest,
//      and index.html are hashed here by content so they cannot drift silently).
//   3. Injects the manifest + version into src/sw.ts, transforms it with esbuild to
//      a classic dist/sw.js.
//   4. AUDITS: re-walks dist/ and fails the build if any emitted asset is missing
//      from the precache list (build-plan amendment: precache completeness against
//      the production asset graph, atomic install).
//
// This is the amendments' "precache audit" gate. It runs only on `vite build`.

import { transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

const SW_SOURCE = 'src/sw.ts';
const SW_OUTPUT = 'sw.js';

/** Recursively list files under `dir`, returned as POSIX paths relative to `dir`. */
async function walk(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // skip dotfiles (e.g. .DS_Store)
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else {
      out.push(relative(base, full).split(sep).join(posix.sep));
    }
  }
  return out;
}

/** A dist file belongs in the precache unless it is the SW itself or a source map. */
function isPrecacheable(relPath: string): boolean {
  return relPath !== SW_OUTPUT && !relPath.endsWith('.map');
}

/**
 * Verify the CSP style-src hash in the built index.html actually matches the inline
 * style element, so the hash can never silently drift (which would let the anti-flash
 * background be blocked and the studio see a white flash). Comments are stripped first
 * so a literal `<style>` inside the CSP comment cannot be mistaken for the element.
 */
async function verifyCspHash(indexPath: string): Promise<void> {
  const html = await readFile(indexPath, 'utf8');
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const styleMatch = withoutComments.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) return; // no inline style: nothing to pin
  const expected = createHash('sha256').update(styleMatch[1], 'utf8').digest('base64');
  if (!html.includes(`'sha256-${expected}'`)) {
    throw new Error(
      `[sw] CSP audit FAILED — index.html inline style hash is sha256-${expected}, ` +
        `but that value is not present in the Content-Security-Policy. Update style-src.`,
    );
  }
}

export function serviceWorkerPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'settle-in-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      const outDir = config.build.outDir;

      // 1. Precache manifest — every shell asset (sw.js not written yet).
      const files = (await walk(outDir)).filter(isPrecacheable).sort();
      if (!files.some((f) => f === 'index.html')) {
        throw new Error('[sw] precache audit: index.html missing from build output');
      }

      // CSP hash must match the inline style, or the shell is broken at runtime.
      await verifyCspHash(join(outDir, 'index.html'));

      // 2. Content-hash version: hash of each path + its bytes, so any change bumps.
      const hash = createHash('sha256');
      for (const f of files) {
        hash.update(f);
        hash.update(await readFile(join(outDir, ...f.split(posix.sep))));
      }
      const version = `v-${hash.digest('hex').slice(0, 12)}`;

      // 3. Inject + transform the worker source. replaceAll (not replace): the token
      // also appears in the file's doc comment, and replacing only the first hit would
      // leave the real placeholder untouched (esbuild then strips the comment copy).
      let source = await readFile(SW_SOURCE, 'utf8');
      source = source.replaceAll("'__CACHE_VERSION__'", JSON.stringify(version));
      source = source.replaceAll('[/* __PRECACHE__ */]', JSON.stringify(files));
      const { code } = await transform(source, {
        loader: 'ts',
        target: 'es2020',
        format: 'iife',
      });
      const banner = `// Settle In service worker — generated at build (${version}); do not edit.\n`;
      await writeFile(join(outDir, SW_OUTPUT), banner + code, 'utf8');

      // 4. Independent audit: every emitted asset (bar the SW / maps) is precached.
      const precached = new Set(files);
      const afterWrite = await walk(outDir);
      const missing = afterWrite.filter((f) => isPrecacheable(f) && !precached.has(f));
      if (missing.length > 0) {
        throw new Error(
          `[sw] precache audit FAILED — ${missing.length} emitted asset(s) not in the precache list:\n` +
            missing.map((m) => `  - ${m}`).join('\n'),
        );
      }

      config.logger.info(
        `\n✓ service worker: precached ${files.length} assets (${version})`,
      );
    },
  };
}
