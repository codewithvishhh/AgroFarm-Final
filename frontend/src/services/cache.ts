/**
 * Small offline cache.
 *
 * Dashboard payloads are written here after every successful load, so a
 * dropped connection shows the last known figures instead of an empty screen.
 */
const PREFIX = "agrofarm:cache:";

interface Entry<T> {
  savedAt: number;
  value: T;
}

export function writeCache<T>(key: string, value: T): void {
  try {
    const entry: Entry<T> = { savedAt: Date.now(), value };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or blocked. Caching is optional.
  }
}

export function readCache<T>(key: string): { value: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    return { value: entry.value, savedAt: entry.savedAt };
  } catch {
    return null;
  }
}

export function clearCache(): void {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}
