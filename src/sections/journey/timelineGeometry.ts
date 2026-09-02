/**
 * Geometria da linha do tempo — matemática pura, sem React e sem DOM.
 *
 * A curva vive num `viewBox` de 1000×132 com `preserveAspectRatio="none"`: ela
 * estica na largura sem deformar os nós, que são HTML posicionado em **% do
 * mesmo sistema de coordenadas**.
 *
 * O ponto central do desenho: a onda está ancorada no **tempo**, não na tela. O
 * caminho cobre várias janelas e navegar é um `translateX` no grupo — a curva
 * anda junto com os nós e **nunca é recalculada**.
 */

/** Vagas visíveis na janela. Mais entradas não poluem a curva: elas entram pela janela. */
export const VAGAS = 6;

/**
 * Vagas numa tela estreita.
 *
 * A curva ocupa a largura da tela em qualquer tamanho, então o que muda com ela
 * é a distância entre os nós: seis em 360px caem a ~62px um do outro, e o
 * rótulo `ano.mês` de um encosta no do vizinho muito antes de a área de toque de
 * 38px ficar sem ambiguidade. Com quatro a distância dobra.
 */
export const VAGAS_ESTREITO = 4;

/** Espaçamento entre eventos, em fração da largura da curva. Sempre uniforme. */
export const passoDe = (vagas: number): number => 1 / (vagas - 1);

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

/**
 * Janelas cobertas pelo caminho, e o `u` onde ele começa.
 *
 * Só uma delas está na tela a cada momento; as outras são a folga por onde a
 * onda desliza. Duas coisas gastam essa folga:
 *
 * - **o deslocamento da janela**, que vale `(n − vagas) / (vagas − 1)` janelas e
 *   cresce quando as vagas diminuem — com quatro vagas cada passo anda ⅓ de
 *   período contra ⅕ com seis, então sete entradas no mobile deslocam uma janela
 *   inteira, cinco vezes o que deslocam no desktop;
 * - **a animação de entrada**, ±820px ≈ 0,9 janela, em sentidos opostos para a
 *   onda principal e a inversa.
 *
 * Passar da folga descobre a ponta da curva, e a onda aparece começando do nada
 * no meio da tela. Cinco janelas dão teto para ~1,95 janela de deslocamento:
 * **nove entradas no mobile, quinze no desktop**. Passar disso pede uma janela a
 * mais aqui — e só isso, porque tudo que depende do comprimento sai daqui.
 */
const JANELAS = 5;
const U0 = -2;

/** Amostras por janela: ~13 unidades do viewBox entre pontos, numa senoide suave. */
const POR_JANELA = 72;

/**
 * O caminho da onda, em `d` de `<path>`.
 *
 * Calculado uma única vez no carregamento do módulo: ele não depende de estado
 * nenhum, só das constantes acima — nem do número de vagas, que muda o
 * espaçamento dos nós e o quanto a curva desliza, nunca o desenho dela.
 */
export const CAMINHO: string = (() => {
  const amostras = POR_JANELA * JANELAS;
  let d = '';
  for (let k = 0; k <= amostras; k++) {
    const u = U0 + (JANELAS * k) / amostras;
    d += `${k ? 'L' : 'M'}${cxA(u).toFixed(1)},${cyA(u).toFixed(1)}`;
  }
  return d;
})();

/**
 * Os pulsos que viajam pela curva: quantos são e quanto levam para percorrê-la.
 *
 * Os dois saem de `JANELAS`, para que o comprimento do caminho não mude o que se
 * vê. 13s por janela mantém a **velocidade** do pulso; um pulso por janela
 * mantém a **densidade** — em média um na tela a qualquer momento. A defasagem é
 * `DUR_PULSO / PULSOS`, então eles ficam igualmente espaçados na curva.
 */
export const PULSOS = JANELAS;
export const DUR_PULSO = 13 * JANELAS;

export interface Janela {
  /** vagas desta janela — muda com a largura da tela */
  vagas: number;
  /** espaçamento entre vagas, em fração da largura */
  passo: number;
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
 * Estado da janela de `vagas` para `total` eventos, deslocada em `desl`.
 *
 * Com **menos entradas que vagas** o grupo fica centrado (`base`) e a janela não
 * desliza. Com mais, `primeiro = maxDesl − desl` diz qual evento ocupa a
 * primeira vaga.
 */
export function calcularJanela(total: number, desl: number, vagas: number): Janela {
  const n = Math.max(1, total);
  const passo = passoDe(vagas);
  const maxDesl = Math.max(0, n - vagas);
  const d = Math.max(0, Math.min(maxDesl, desl));
  const primeiro = maxDesl - d;
  const cabeTudo = n < vagas;
  const base = cabeTudo ? (1 - (n - 1) * passo) / 2 : 0;
  const S = cabeTudo ? 0 : primeiro * passo;
  const uDe = (i: number) => i * passo + base;

  return {
    vagas,
    passo,
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
  const { maxDesl, primeiro, vagas } = janela;
  let desl = janela.desl;
  if (alvo > primeiro + vagas - 1) desl = maxDesl - (alvo - vagas + 1);
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
