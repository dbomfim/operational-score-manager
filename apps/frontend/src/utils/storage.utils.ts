const TTL_SUFFIX = "_ttl";

export function getWithTTL<T>(key: string, parse: (s: string) => T): T | null {
  const raw = localStorage.getItem(key);
  const ttlRaw = localStorage.getItem(key + TTL_SUFFIX);
  if (!raw || !ttlRaw) return null;
  const ttl = parseInt(ttlRaw, 10);
  if (Date.now() > ttl) {
    localStorage.removeItem(key);
    localStorage.removeItem(key + TTL_SUFFIX);
    return null;
  }
  try {
    return parse(raw);
  } catch {
    return null;
  }
}

export function setWithTTL(key: string, value: string, ttlMs: number): void {
  localStorage.setItem(key, value);
  localStorage.setItem(key + TTL_SUFFIX, String(Date.now() + ttlMs));
}
