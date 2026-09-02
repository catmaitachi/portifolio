/** Tabelas e constantes compartilhadas por todas as camadas. */

export const TAU = 6.283185307179586;

/* LUT de seno: a cena chama seno milhares de vezes por quadro (plasma, cintilar,
   órbitas). A tabela troca o cálculo por uma indexação. */
const ST = 1024;
const STM = ST - 1;
const SIN = new Float32Array(ST);
for (let i = 0; i < ST; i++) SIN[i] = Math.sin((i / ST) * TAU);
const SK = ST / TAU;

/** Seno por tabela. Precisão de ~0.1° — suficiente para efeito visual. */
export const fastSin = (v: number): number => SIN[((v * SK) | 0) & STM];

/** Cosseno pela mesma tabela, com um quarto de volta de defasagem. */
export const fastCos = (v: number): number => SIN[(((v + TAU / 4) * SK) | 0) & STM];

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;
