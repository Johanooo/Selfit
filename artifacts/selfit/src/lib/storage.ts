/** Safe browser storage – reads fall back and writes report whether they succeeded. */
export function readJSON<T>(key: string, fallback: T, store: 'local' | 'session' = 'local'): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = (store === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, store: 'local' | 'session' = 'local'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    (store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
