// Display formatting for live times — all derived from durable epoch instants
// through the model's rules, never reimplemented timing math.
//
// Class times display in the device's local zone on a 12-hour clock without
// seconds (docs/implementation-treaty.md § Time model). The wall clock omits the
// meridiem to match the hard-close indicator's `8:00 · hard close` styling and to
// keep the two-second glance uncluttered — the yin class is always evening.

const EN_DASH = '–';

/** Local 12-hour `h:mm` label (no seconds, no meridiem) for an epoch instant. */
export function wallClock12h(epochMs: number, offsetMinutes: number): string {
  const local = new Date(epochMs + offsetMinutes * 60_000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m < 10 ? '0' : ''}${m}`;
}

/** A planned window as `7:15–7:19`, both ends in local 12-hour time. */
export function plannedWindowLabel(
  startEpochMs: number,
  endEpochMs: number,
  offsetMinutes: number,
): string {
  return `${wallClock12h(startEpochMs, offsetMinutes)}${EN_DASH}${wallClock12h(
    endEpochMs,
    offsetMinutes,
  )}`;
}

/** Human class date like `Tue, Jul 28`, from a `YYYY-MM-DD` string. */
export function classDateLabel(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${days[date.getUTCDay()]}, ${months[mo - 1]} ${d}`;
}

/** Whole planned minutes for a segment, for Prep's side-aware sequence. */
export function minutesLabel(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

/** Capitalize a side word for display (`right` → `Right`). */
export function sideLabel(side: 'right' | 'left'): string {
  return side === 'right' ? 'Right' : 'Left';
}
