// Local UI preferences, persisted through the store's relaxed-durability
// preferences box (docs/implementation-treaty.md § Persistence model: preferences
// may use relaxed durability). V1 has exactly one such preference — the next-pose
// preview toggle, default ON (screen-states.md § 4 Prep, Display Options).

import type { Store } from '../store/index.js';

const NEXT_POSE_PREVIEW_KEY = 'pref.nextPosePreview';

export interface Preferences {
  /** Show the quiet next-pose preview on live screens. Default true. */
  readonly nextPosePreview: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  nextPosePreview: true,
};

/** Load preferences, falling back to defaults for any unset key. */
export async function loadPreferences(store: Store): Promise<Preferences> {
  const raw = await store.getPreference(NEXT_POSE_PREVIEW_KEY);
  return {
    nextPosePreview: typeof raw === 'boolean' ? raw : DEFAULT_PREFERENCES.nextPosePreview,
  };
}

/** Persist the next-pose-preview preference (relaxed durability is fine here). */
export async function setNextPosePreview(store: Store, value: boolean): Promise<void> {
  await store.setPreference(NEXT_POSE_PREVIEW_KEY, value);
}
