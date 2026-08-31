/** Curvas de tempo compartilhadas pelo motor. `p` vai de 0 a 1. */
export type Ease = (p: number) => number;

export const easeInOutCubic: Ease = (p) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

/** Saída forte: quase todo o movimento acontece no começo. Usada pela câmera. */
export const easeOutQuart: Ease = (p) => 1 - Math.pow(1 - p, 4);
