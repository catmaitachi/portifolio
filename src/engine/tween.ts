import type { Ease } from './easing';
import { easeInOutCubic } from './easing';

/**
 * Interpola uma propriedade numérica de qualquer objeto num rAF próprio.
 *
 * Existe para animar propriedades que não são CSS (o `strength` do buraco negro,
 * a `opacity` de uma camada de constelações). Chamar de novo na mesma propriedade
 * cancela o tween anterior — sem isso, duas trocas de seção rápidas deixariam
 * dois rAF disputando o mesmo valor.
 */
const running = new WeakMap<object, Map<string, number>>();

export function tween<T extends object, K extends keyof T & string>(
  obj: T,
  key: K,
  to: number,
  dur = 1,
  ease: Ease = easeInOutCubic,
): () => void {
  let keys = running.get(obj);
  if (!keys) {
    keys = new Map();
    running.set(obj, keys);
  }
  const prev = keys.get(key);
  if (prev !== undefined) cancelAnimationFrame(prev);

  const from = (obj[key] as number) ?? 0;
  if (dur <= 0) {
    (obj[key] as number) = to;
    return () => {};
  }

  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / (dur * 1000));
    (obj[key] as number) = from + (to - from) * ease(p);
    if (p < 1) keys.set(key, requestAnimationFrame(step));
    else keys.delete(key);
  };
  keys.set(key, requestAnimationFrame(step));

  return () => {
    const id = keys.get(key);
    if (id !== undefined) cancelAnimationFrame(id);
    keys.delete(key);
  };
}
