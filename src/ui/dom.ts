// Tiny DOM helpers — the ONLY way this app builds elements.
//
// Every dynamic string, including all imported class content, is placed with
// `textContent` / `createTextNode`. `innerHTML` is never used here or anywhere
// in src/ui: imported Markdown/YAML must never become executable HTML
// (docs/implementation-treaty.md § Privacy and security posture; product spec
// principle 7). This module deliberately exposes no HTML-string API.

/** Attributes an element may take. `text` becomes a text node; `class` a className. */
export interface ElOptions {
  class?: string;
  text?: string;
  /** aria-* and data-* and plain attributes, set via setAttribute (string values only). */
  attrs?: Record<string, string>;
  /** Event handlers keyed by event name. */
  on?: Partial<Record<keyof HTMLElementEventMap, (ev: Event) => void>>;
  /** Child nodes appended in order. */
  children?: (Node | null | undefined)[];
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.class) node.className = options.class;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      node.setAttribute(key, value);
    }
  }
  if (options.on) {
    for (const [event, handler] of Object.entries(options.on)) {
      if (handler) node.addEventListener(event, handler as EventListener);
    }
  }
  if (options.children) {
    for (const child of options.children) {
      if (child) node.appendChild(child);
    }
  }
  return node;
}

/** Remove all children of a node (used by the central renderer before a rebuild). */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** A plain text node — the safe primitive for any dynamic/imported string. */
export function text(value: string): Text {
  return document.createTextNode(value);
}
