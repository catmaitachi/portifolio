/**
 * Leitura tipada e tolerante do `import.meta.env`.
 *
 * Toda variável passa por aqui — nenhum outro módulo deve tocar em
 * `import.meta.env` diretamente. Isso mantém um único ponto de verdade
 * para defaults, coerção de tipos e validação.
 */

type RawEnv = Record<string, string | boolean | undefined>;

const raw: RawEnv = import.meta.env as unknown as RawEnv;

/** Problemas encontrados na leitura — exibidos pelo comando `diag`. */
export const envIssues: string[] = [];

function report(key: string, message: string): void {
  envIssues.push(`${key}: ${message}`);
}

/** Remove aspas acidentais deixadas no arquivo .env. */
function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

export function str(key: string, fallback: string): string {
  const value = raw[key];
  if (typeof value !== 'string') return fallback;
  const clean = unquote(value);
  return clean.length > 0 ? clean : fallback;
}

export function optionalStr(key: string): string | null {
  const value = str(key, '');
  return value.length > 0 ? value : null;
}

export function bool(key: string, fallback: boolean): boolean {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const clean = unquote(value).toLowerCase();
  if (['1', 'true', 'yes', 'on', 'sim'].includes(clean)) return true;
  if (['0', 'false', 'no', 'off', 'nao', 'não'].includes(clean)) return false;
  report(key, `valor booleano inválido ("${clean}") — usando ${fallback}`);
  return fallback;
}

export function num(key: string, fallback: number): number {
  const value = str(key, '');
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  report(key, `valor numérico inválido ("${value}") — usando ${fallback}`);
  return fallback;
}

/** Lista separada por vírgulas, já limpa de itens vazios. */
export function list(key: string, fallback: string[]): string[] {
  const value = str(key, '');
  if (!value) return fallback;
  const items = value
    .split(',')
    .map((item) => unquote(item))
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

/** Valor restrito a um conjunto conhecido. */
export function oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = str(key, fallback);
  if ((allowed as readonly string[]).includes(value)) return value as T;
  report(key, `valor "${value}" fora de [${allowed.join(' | ')}] — usando ${fallback}`);
  return fallback;
}

/** Cor hexadecimal (#rgb ou #rrggbb). */
export function color(key: string, fallback: string): string {
  const value = str(key, fallback);
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  report(key, `cor inválida ("${value}") — usando ${fallback}`);
  return fallback;
}

export const isDev: boolean = Boolean(raw.DEV);
export const mode: string = typeof raw.MODE === 'string' ? raw.MODE : 'production';
