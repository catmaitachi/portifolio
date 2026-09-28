/**
 * A geometria da órbita da Carreira: matemática pura, sem React e sem DOM.
 *
 * **O desenho e os corpos saem da mesma conta.** O anel é uma elipse num
 * `viewBox` de `W`×`H`, e o contêiner tem exatamente essa proporção, então um
 * ponto `(x, y)` do `viewBox` cai em `(x/W, y/H)` da caixa, sem sobra. Cada
 * corpo é posicionado por `ponto()`, que é a equação da mesma elipse: ele fica
 * **sobre a linha**, com erro de 0px por construção. A versão anterior inclinava
 * um círculo de CSS em `rotateX` e posicionava os corpos por uma elipse
 * calculada à parte, e os dois desenhos não coincidiam.
 */

export const W = 1000;
export const H = 560;

/** O centro e os raios do anel. O de fora é o tracejado, só desenho. */
export const CX = W / 2;
export const CY = H / 2;
export const RX = 430;
export const RY = 150;
export const RX_FORA = 490;
export const RY_FORA = 190;

/** Uma volta inteira, em ms: devagar o bastante para se clicar num corpo andando. */
export const PERIODO = 60_000;

/** O ângulo da frente: embaixo, o ponto mais perto de quem olha. */
export const FRENTE = Math.PI / 2;

const VOLTA = Math.PI * 2;

/** O ponto da elipse no ângulo `a`, em fração da caixa (0 a 1). */
export function ponto(a: number): { x: number; y: number } {
  return { x: (CX + RX * Math.cos(a)) / W, y: (CY + RY * Math.sin(a)) / H };
}

/**
 * Quão à frente está o ângulo `a`: 1 embaixo (perto), 0 em cima (longe). É a
 * profundidade que decide tamanho, brilho e quem passa na frente de quem.
 */
export const profundidade = (a: number): number => (Math.sin(a) + 1) / 2;

/** O ângulo do corpo `i` de `n`, com a fase da órbita: os corpos ficam igualmente espaçados. */
export const angulo = (fase: number, i: number, n: number): number => fase + (i * VOLTA) / n;

/**
 * A fase em que o corpo `i` fica na frente, **adiante** da fase atual.
 *
 * Sempre adiante: a órbita só gira num sentido, e trazer um corpo para a frente
 * andando para trás leria como a órbita voltando no tempo.
 */
export function faseParaFrente(atual: number, i: number, n: number): number {
  const alvo = FRENTE - (i * VOLTA) / n;
  const delta = (((alvo - atual) % VOLTA) + VOLTA) % VOLTA;
  return atual + delta;
}

/** Os dois arcos do anel, de trás (em cima) e da frente (embaixo), como `d` de `<path>`. */
export function arcos(rx: number, ry: number): { tras: string; frente: string } {
  const esq = `${CX - rx} ${CY}`;
  const dir = `${CX + rx} ${CY}`;
  return {
    tras: `M ${esq} A ${rx} ${ry} 0 0 1 ${dir}`,
    frente: `M ${dir} A ${rx} ${ry} 0 0 1 ${esq}`,
  };
}
