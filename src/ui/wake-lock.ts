// Screen wake-lock manager.
//
// docs/implementation-treaty.md § Wake-lock treaty: request from the user-initiated
// Begin Class action, monitor release, re-request whenever the document becomes
// visible during an active run, release on finish/abandon, and NEVER promise the
// platform will grant it. When unavailable, the caller shows a quiet inline
// indicator (`Screen may sleep · tap to retry`) that never obscures teaching
// content, flashes, vibrates, or posts a notification.
//
// This module touches only the Screen Wake Lock API — no audio, vibration, or
// notification API is referenced anywhere (product spec principle 1).

type WakeLockState = 'idle' | 'held' | 'unavailable';

interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

interface WakeLockNavigator {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
}

export class WakeLockManager {
  private sentinel: WakeLockSentinelLike | null = null;
  private state: WakeLockState = 'idle';
  private wanted = false;

  constructor(private readonly onStateChange: (available: boolean, held: boolean) => void) {}

  /** True only when a lock is actually held right now. Never a promise of success. */
  get isHeld(): boolean {
    return this.state === 'held';
  }

  /** True when the platform exposed no wake-lock capability or refused the request. */
  get isUnavailable(): boolean {
    return this.state === 'unavailable';
  }

  private nav(): WakeLockNavigator | null {
    return typeof navigator !== 'undefined' ? (navigator as WakeLockNavigator) : null;
  }

  /**
   * Request the lock from a user gesture (Begin / Resume) or a visibility change.
   * Returns whether a lock is now held; a false return is not an error — the quiet
   * indicator is the honest fallback.
   */
  async request(): Promise<boolean> {
    this.wanted = true;
    const nav = this.nav();
    if (!nav || !nav.wakeLock) {
      this.setState('unavailable');
      return false;
    }
    if (this.sentinel) return true;
    try {
      const sentinel = await nav.wakeLock.request('screen');
      this.sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        this.sentinel = null;
        // A platform-initiated release while we still want the lock is not held.
        if (this.wanted) this.setState('idle');
      });
      this.setState('held');
      return true;
    } catch {
      this.sentinel = null;
      this.setState('unavailable');
      return false;
    }
  }

  /** Re-request on visibility if the lock is wanted but not held (called on `visible`). */
  async reacquireIfWanted(): Promise<void> {
    if (this.wanted && !this.sentinel) {
      await this.request();
    }
  }

  /** Release and stop wanting the lock (finish / abandon). */
  async release(): Promise<void> {
    this.wanted = false;
    const sentinel = this.sentinel;
    this.sentinel = null;
    this.setState('idle');
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // Releasing a lock the platform already dropped is fine.
      }
    }
  }

  private setState(state: WakeLockState): void {
    this.state = state;
    this.onStateChange(state !== 'unavailable', state === 'held');
  }
}
