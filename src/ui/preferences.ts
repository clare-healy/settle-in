// Local UI preferences, persisted through the store's relaxed-durability
// preferences box (docs/implementation-treaty.md § Persistence model: preferences
// may use relaxed durability). V1 has exactly one such preference — the next-pose
// preview toggle, default ON (screen-states.md § 4 Prep, Display Options).

import type { Store } from '../store/index.js';

const NEXT_POSE_PREVIEW_KEY = 'pref.nextPosePreview';
const UPCOMING_CLASS_KEY = 'pref.upcomingClassId';

export interface Preferences {
  /** Show the quiet next-pose preview on live screens. Default true. */
  readonly nextPosePreview: boolean;
  /** Clare's explicit upcoming-class choice (classId), or null to use the suggestion. */
  readonly upcomingClassId: string | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  nextPosePreview: true,
  upcomingClassId: null,
};

/** Load preferences, falling back to defaults for any unset key. */
export async function loadPreferences(store: Store): Promise<Preferences> {
  const [preview, upcoming] = await Promise.all([
    store.getPreference(NEXT_POSE_PREVIEW_KEY),
    store.getPreference(UPCOMING_CLASS_KEY),
  ]);
  return {
    nextPosePreview: typeof preview === 'boolean' ? preview : DEFAULT_PREFERENCES.nextPosePreview,
    upcomingClassId: typeof upcoming === 'string' ? upcoming : DEFAULT_PREFERENCES.upcomingClassId,
  };
}

/** Persist the next-pose-preview preference (relaxed durability is fine here). */
export async function setNextPosePreview(store: Store, value: boolean): Promise<void> {
  await store.setPreference(NEXT_POSE_PREVIEW_KEY, value);
}

/** Persist Clare's explicit upcoming-class choice (relaxed durability is fine here). */
export async function setUpcomingClassId(store: Store, classId: string): Promise<void> {
  await store.setPreference(UPCOMING_CLASS_KEY, classId);
}
