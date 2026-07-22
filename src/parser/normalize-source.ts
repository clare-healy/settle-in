// Source normalization and identity.
//
// `source_hash` identifies the imported Markdown after converting CRLF and CR
// newlines to LF and removing one optional UTF-8 BOM. All other whitespace —
// including the final newline and any trailing spaces — remains significant
// (docs/implementation-treaty.md § Identity and immutability).

const BOM_CODE_POINT = 0xfeff;

/** CRLF/CR -> LF, then strip a single leading BOM. Nothing else is touched. */
export function normalizeSource(input: string): string {
  let text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (text.charCodeAt(0) === BOM_CODE_POINT) {
    text = text.slice(1);
  }
  return text;
}

/** True when the source contains a NUL byte and cannot be read as text. */
export function containsNul(text: string): boolean {
  return text.indexOf('\u0000') !== -1;
}

/** SHA-256 of the normalized UTF-8 source, as lowercase hex (Web Crypto). */
export async function sourceHash(normalized: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
