// Export delivery — the DOM side of getting a generated file to Clare.
//
// docs/implementation-treaty.md § Export delivery (M5 work order): downloads are
// triggered via a Blob + anchor so they work inside a standalone installed PWA
// (no server round-trip), and the two Markdown exports also offer copy-to-clipboard
// for handing back to the authoring assistant. This is the only place the export
// path touches the DOM; the generators in src/export stay pure and golden-testable.

/**
 * Trigger a client-side download of `text` as `filename`. Uses an object URL and a
 * programmatic anchor click, then revokes the URL. Works in a standalone PWA.
 */
export function triggerDownload(filename: string, text: string, mime: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  // Not attached to the document: a detached anchor still dispatches its click.
  anchor.click();
  // Revoke on the next tick so the download has claimed the URL first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Download a Markdown file (`text/markdown`). */
export function downloadMarkdown(filename: string, text: string): void {
  triggerDownload(filename, text, 'text/markdown;charset=utf-8');
}

/** Download a JSON file (`application/json`). */
export function downloadJson(filename: string, text: string): void {
  triggerDownload(filename, text, 'application/json;charset=utf-8');
}

/**
 * Copy `text` to the clipboard, resolving true on success. Tries the async
 * Clipboard API first, then falls back to a hidden textarea + execCommand for
 * older/embedded webviews, and resolves false if neither is available — the caller
 * then shows a quiet fallback (the source stays selectable on screen).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the execCommand path below.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
