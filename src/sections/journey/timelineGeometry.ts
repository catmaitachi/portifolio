/**
 * Geometria da linha do tempo — matemática pura, sem React e sem DOM.
 *
 * A curva vive num `viewBox` de 1000×132 com `preserveAspectRatio="none"`: ela
 * estica na largura sem deformar os nós, que são HTML posicionado em **% do
 * mesmo sistema de coordenadas**.
 *
 * O ponto central do desenho: a onda está ancorada no **tempo**, não na tela. O
 * caminho cobre três janelas (u de −1 a 2) e navegar é um `translateX` no grupo
 * — a curva anda junto com os nós e **nunca é recalculada**.
 */

/** Vagas visíveis na janela. Mais entradas não poluem a curva: elas entram pela janela. */
export const VAGAS = 6;

/** Espaçamento entre eventos, em fração da largura da curva. Sempre uniforme. */
export const PASSO = 1 / (VAGAS - 1);

export const VIEW_W = 1000;
export const VIEW_H = 132;

/** Largura útil da curva em unidades do viewBox (de u=0 a u=1). */
export const SPAN = 912;

/** x da curva no tempo absoluto `u`. */
export const cxA = (u: number): number => 44 + SPAN * u;

/**
 * y da curva no tempo absoluto `u`.
 *
 * O deslocamento de ⅛ de período põe o primeiro evento subindo, não num pico —
 * um nó exatamente no topo da onda fica ambíguo quanto a onde pôr o rótulo.
 */
export const cyA = (u: number): number => 66 - 42 * Math.sin(2 * Math.PI * (u - 0.125));

/** Amostras do caminho. 216 pontos em três janelas = ~1 ponto a cada 4px de tela. */
const AMOSTRAS = 216;

/**
 * O caminho da onda, em `d` de `<path>`.
 *
 * Calculado uma única vez no carregamento do módulo: ele não depende de estado
 * nenhum, só das constantes acima.
 */
export const CAMINHO: string = (() => {
  let d = '';
  for (let k = 0; k <= AMOSTRAS; k++) {
    const u = -1 + (3 * k) / AMOSTRAS;
    d += `${k ? 'L' : 'M'}${cxA(u).toFixed(1)},${cyA(u).toFixed(1)}`;
  }
  return d;
})();

export interface Janela {
  /** deslocamento atual (pode ser fracionário durante o arraste) */
  desl: number;
  /** deslocamento máximo — 0 quando tudo cabe */
  maxDesl: number;
  /** índice do evento na primeira vaga */
  primeiro: number;
  /** deslocamento da curva em unidades do viewBox */
  shiftX: number;
  /** `u` absoluto de um evento pelo índice */
  uDe: (i: number) => number;
  /** `u` na tela (já descontado o deslocamento da janela) */
  uNaTela: (i: number) => number;
}

/**
 * Estado da janela para `total` eventos, deslocada em `desl`.
 *
 * Com **menos entradas que vagas** o grupo fica centrado (`base`) e a janela não
 * desliza. Com mais, `primeiro = maxDesl − desl` diz qual evento ocupa a
 * primeira vaga.
 */
export function calcularJanela(total: number, desl: number): Janela {
  const n = Math.max(1, total);
  const maxDesl = Math.max(0, n - VAGAS);
  const d = Math.max(0, Math.min(maxDesl, desl));
  const primeiro = maxDesl - d;
  const cabeTudo = n < VAGAS;
  const base = cabeTudo ? (1 - (n - 1) * PASSO) / 2 : 0;
  const S = cabeTudo ? 0 : primeiro * PASSO;
  const uDe = (i: number) => i * PASSO + base;

  return {
    desl: d,
    maxDesl,
    primeiro,
    shiftX: -SPAN * S,
    uDe,
    uNaTela: (i) => uDe(i) - S,
  };
}

/**
 * Desloca a janela o **mínimo** necessário para o alvo caber nas vagas.
 *
 * Devolve o novo deslocamento. Se o alvo já está visível, nada muda — a janela
 * não se move só porque o visitante mudou de evento.
 */
export function janelaQueContem(janela: Janela, alvo: number): number {
  const { maxDesl, primeiro } = janela;
  let desl = janela.desl;
  if (alvo > primeiro + VAGAS - 1) desl = maxDesl - (alvo - VAGAS + 1);
  else if (alvo < primeiro) desl = maxDesl - alvo;
  return Math.max(0, Math.min(maxDesl, desl));
}

/**
 * Deslocamento horizontal do corte que preenche a curva até o evento ativo.
 *
 * O `<rect>` do `clipPath` termina em x=1000; transladá-lo por `cx − 1000` faz a
 * borda cair **exatamente** sobre o nó. A curva é função de x, então uma borda
 * vertical intercepta a curva num único ponto — erro de 0px por construção.
 *
 * (Tracejado com `pathLength` foi descartado: com `non-scaling-stroke` o dash é
 * medido em pixels de tela e a escala do viewBox não é uniforme, então o traço
 * passava do ponto.)
 */
export const corteAte = (uAtivo: number): number => cxA(uAtivo) - VIEW_W;

/** Um nó só é visível — e navegável — dentro da janela. */
export const dentroDaJanela = (uTela: number): boolean => uTela >= -0.01 && uTela <= 1.01;
