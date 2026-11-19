/** Safe browser storage – no-ops outside the browser or when blocked. */
export function readJSON<T>(key: string, fallback: T, store: 'local' | 'session' = 'local'): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, store: 'local' | 'session' = 'local'): void {
  if (typeof window === 'undefined') return;
  try {
    (store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable – ignore */
  }
}
