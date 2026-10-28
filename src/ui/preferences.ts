// Local UI preferences, persisted through the store's relaxed-durability
// preferences box (docs/implementation-treaty.md § Persistence model: preferences
// may use relaxed durability): the next-pose preview toggle, default ON
// (screen-states.md § 4 Prep, Display Options); Clare's upcoming-class choice; and,
// per class, the revision she last chose to teach from.

import type { PreferenceEntry, Store } from '../store/index.js';

const NEXT_POSE_PREVIEW_KEY = 'pref.nextPosePreview';
const UPCOMING_CLASS_KEY = 'pref.upcomingClassId';
const CURRENT_REVISION_PREFIX = 'pref.currentRevision.';

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

/**
 * Record the revision Clare last chose for a class: a schedule correction or a
 * newly imported revision. A correction can resolve to a revision that is already
 * stored (changing a time back), so "most recently imported" alone cannot say
 * which revision Prep should show (implementation treaty § Schedule correction).
 */
export function currentRevisionPreference(classId: string, sourceHash: string): PreferenceEntry {
  return { key: `${CURRENT_REVISION_PREFIX}${classId}`, value: sourceHash };
}

/** Every recorded current-revision choice, as classId → sourceHash. */
export async function loadCurrentRevisions(store: Store): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const { key, value } of await store.getAllPreferenceEntries()) {
    if (key.startsWith(CURRENT_REVISION_PREFIX) && typeof value === 'string') {
      out.set(key.slice(CURRENT_REVISION_PREFIX.length), value);
    }
  }
  return out;
}
