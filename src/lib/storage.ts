/**
 * Acesso ao localStorage tolerante a falhas (aba anônima, cookies
 * bloqueados, quota cheia). Nunca lança.
 */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* silêncio proposital: persistência é conveniência, não requisito */
  }
}
