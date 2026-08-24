/**
 * Sorteio de itens.
 *
 * `avoid` evita repetir o valor anterior — quem clica em "sortear outro"
 * espera ver algo diferente.
 */
export function pickRandom<T>(items: readonly T[], avoid?: T): T | null {
  if (items.length === 0) return null;

  const pool = items.length > 1 && avoid !== undefined
    ? items.filter((item) => item !== avoid)
    : items;

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
