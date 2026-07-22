// Reduced-motion detection.
//
// design-system.md § Motion: honor `prefers-reduced-motion: reduce` by eliminating
// the positional settle and shortening cross-fades; the wake message may fade
// briefly or appear immediately. The screen-enter class contract encodes this:
// `screen-enter` settles positionally, `screen-enter--reduced` only cross-fades.

/** True when the environment asks for reduced motion. Guards against test stubs. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** The enter-animation class for a freshly mounted screen, honoring reduced motion. */
export function enterClass(): 'screen-enter' | 'screen-enter--reduced' {
  return prefersReducedMotion() ? 'screen-enter--reduced' : 'screen-enter';
}
