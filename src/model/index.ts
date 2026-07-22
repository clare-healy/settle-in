// The timing model — pure functions of (definition, events, clock samples/now).
//
// No DOM, no IndexedDB, no service worker, no timers: time always enters as an
// argument. See docs/implementation-treaty.md § Time model and docs/build-plan.md
// § Clock. This barrel is the model's public surface.

export * from './clock.js';
export * from './time.js';
export * from './drift.js';
export * from './discontinuity.js';
export * from './wake.js';
export * from './status.js';
export * from './actuals.js';
