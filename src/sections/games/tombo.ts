/**
 * O tombo: ele perde o equilíbrio, cai sentado, se recompõe e levanta. É uma
 * cena só, com duas causas: o aceno da chegada, que se empolga demais, e o giro
 * rápido do arraste, que o deixa tonto (`comportamento.ts`). Cada causa é um
 * trecho próprio, e os dois desembocam no mesmo `TOMBO`.
 *
 * **Por que JS, e não `@keyframes`.** A versão em CSS parava em cada pose: o
 * `ease-in-out` vale por trecho entre duas chaves, então a velocidade ia a zero
 * a cada 3% da animação, e a inclinação subia em degraus. Aqui as poses-chave
 * passam por uma curva (`curva`) que só freia onde o movimento muda de sentido,
 * e acelera de verdade onde há um impacto. A curva é amostrada a 40 quadros por
 * segundo e entregue ao `element.animate`: corre no compositor, como o CSS.
 *
 * **Cada nó tem as próprias chaves**, e não os mesmos percentuais. A cabeça e a
 * capa chegam um pouco depois do corpo, e os braços passam do ponto e voltam:
 * é o atraso entre as partes que tira o ar de boneco articulado.
 *
 * As medidas estão em texels e graus. Os sinais, vistos de frente:
 *
 * - `corpo` (o `.quique`, com a origem nos pés): `rz` < 0 inclina para a
 *   esquerda da tela, sobre o pé daquele lado (`PE`), e o outro sobe sozinho;
 *   `rx` > 0 inclina para trás; `sq` > 0 achata, < 0 estica;
 * - `alto` e `cabeca` (o nó de dentro da cabeça): `rx` > 0 vai para trás (a cabeça olha
 *   para cima), `rz` > 0 pende para a direita da tela;
 * - os braços: `rz` abre para fora (positivo no direito, negativo no esquerdo),
 *   `rx` > 0 vai para a frente;
 * - as pernas: `rx` > 0 vai para a frente, e `sentar` (o ângulo das duas) leva
 *   o quadril junto (ver `QUADRIL`).
 */

type Canal = 'x' | 'y' | 'rx' | 'ry' | 'rz' | 'sq';
type Pose = Partial<Record<Canal, number>>;
/** Uma chave: o instante, em segundos, a pose, e se ali acontece um impacto. */
type Chave = [number, Pose] | [number, Pose, 'impacto'];
type Parte = 'corpo' | 'sentar' | 'alto' | 'cabeca' | 'bracoD' | 'bracoE' | 'pernaD' | 'pernaE' | 'capa';
interface Trecho {
  dur: number;
  partes: Partial<Record<Parte, Chave[]>>;
}

export type NomeCena = 'acenar' | 'tonto';

/** Onde fica o apoio quando ele inclina, em texels do meio: entre o centro do pé (1,9) e a borda de fora (3,9). */
const PE = 3;
/** O comprimento da perna, do quadril ao chão. */
const PERNA = 12;
const QUADROS = 40;

/*
 * O aceno: antecipa, o braço dispara para cima, e ele acena com o corpo todo,
 * cada vez mais empolgado e mais inclinado para o lado do braço. Aos 2s nota que
 * está caindo ("opa"), se segura, e o balanço seguinte o leva de vez.
 */
const ACENO: Trecho = {
  dur: 2.9,
  partes: {
    corpo: [
      [0.22, { sq: 0.05, rz: 0.6 }],
      [0.5, { sq: -0.03, rz: -0.8 }],
      [0.8, { sq: 0, rz: -1.2 }],
      [1.05, { rz: -2.4 }],
      [1.26, { rz: -1.8 }],
      [1.47, { rz: -3.6 }],
      [1.68, { rz: -3 }],
      [1.9, { rz: -5.6, x: -0.2 }],
      [2.08, { rz: -1.6, x: -0.3 }],
      [2.34, { rz: -4.5 }],
      [2.62, { rz: -7.5, x: -0.4 }],
    ],
    bracoD: [
      [0.22, { rz: -8, rx: 12, ry: 0 }],
      [0.5, { rz: 176, rx: -10 }],
      [0.72, { rz: 150, rx: -12 }],
      [0.93, { rz: 134, ry: -12 }],
      [1.14, { rz: 166, ry: 12 }],
      [1.35, { rz: 130, ry: -14 }],
      [1.56, { rz: 170, ry: 14 }],
      [1.77, { rz: 127, ry: -16 }],
      [1.98, { rz: 172, ry: 14, rx: -12 }],
      // o "opa": o braço trava no alto enquanto ele se segura
      [2.2, { rz: 160, ry: 0, rx: -4 }],
      [2.42, { rz: 124, ry: -18 }],
      [2.66, { rz: 176, ry: 16, rx: -8 }],
    ],
    bracoE: [
      [0.22, { rz: 5, rx: -4 }],
      [0.55, { rz: -9, rx: 2 }],
      [1.0, { rz: -7, rx: -3 }],
      [1.5, { rz: -11, rx: 3 }],
      [1.9, { rz: -12, rx: -2 }],
      [2.1, { rz: -34, rx: 6 }],
      [2.4, { rz: -18, rx: 0 }],
      [2.7, { rz: -26, rx: 8 }],
    ],
    alto: [
      [0.22, { rx: -5, rz: 0, ry: 0 }],
      [0.55, { rx: 3, rz: 2 }],
      [0.98, { ry: 3 }],
      [1.19, { ry: -3 }],
      [1.4, { ry: 4, rz: 1 }],
      [1.61, { ry: -4 }],
      [1.82, { ry: 4, rz: -1.5 }],
      [2.05, { ry: 0, rz: 6, rx: -3 }],
      [2.4, { ry: -4, rz: -1, rx: 2 }],
      [2.7, { ry: 3, rz: -4 }],
    ],
    cabeca: [
      [0.26, { rx: -5, rz: 0, ry: 0 }],
      [0.62, { rx: 7, rz: -7 }],
      [1.2, { rx: 5, rz: -4 }],
      [1.6, { rx: 7, rz: -8 }],
      [1.98, { rx: 4, rz: -5 }],
      // olha para os pés
      [2.16, { rx: -14, rz: 5, ry: -6 }],
      [2.48, { rx: -6, rz: -2, ry: 0 }],
    ],
    pernaE: [
      [1.95, { rz: 0, rx: 0 }],
      [2.1, { rz: -7, rx: 4 }],
      [2.3, { rz: -1, rx: 0 }],
    ],
    capa: [
      [0.4, { rx: 0 }],
      [0.7, { rx: -7 }],
      [1.1, { rx: -3 }],
      [1.9, { rx: -5 }],
      [2.15, { rx: -11 }],
      [2.5, { rx: -4 }],
    ],
  },
};

/*
 * A tontura: girado rápido demais, ele balança em círculos sobre os pés, a
 * cabeça rodando atrasada e maior que o corpo, os braços boiando para se
 * equilibrar, e um passo trocado. No fim ele pende para o lado e o tombo começa.
 */
const TONTURA: Trecho = {
  dur: 1.8,
  partes: {
    corpo: [
      [0.2, { rz: 4, rx: 0, x: 0 }],
      [0.42, { rz: 0, rx: -4 }],
      [0.64, { rz: -5, rx: 0 }],
      [0.86, { rz: 0, rx: 5 }],
      [1.08, { rz: 6, rx: 0, x: 0.5 }],
      [1.3, { rz: 1, rx: -4 }],
      [1.55, { rz: -7, rx: 0, x: -0.3 }],
    ],
    cabeca: [
      [0.28, { rz: 12, rx: 0, ry: 6 }],
      [0.5, { rz: 0, rx: -12 }],
      [0.72, { rz: -14, rx: 0, ry: -8 }],
      [0.94, { rz: 0, rx: 10 }],
      [1.16, { rz: 15, rx: 0, ry: 8 }],
      [1.38, { rz: 0, rx: -12 }],
      [1.62, { rz: -12, rx: -4, ry: -4 }],
    ],
    alto: [
      [0.24, { rz: -3, rx: 0 }],
      [0.68, { rz: 4, rx: 2 }],
      [1.12, { rz: -5, rx: -2 }],
      [1.58, { rz: 5, rx: 0 }],
    ],
    bracoD: [
      [0.3, { rz: 24, rx: 6 }],
      [0.75, { rz: 14, rx: -6 }],
      [1.2, { rz: 32, rx: 10 }],
      [1.55, { rz: 22, rx: 0 }],
    ],
    bracoE: [
      [0.3, { rz: -14, rx: -6 }],
      [0.75, { rz: -28, rx: 8 }],
      [1.2, { rz: -16, rx: -4 }],
      [1.55, { rz: -36, rx: 6 }],
    ],
    // o passo trocado: a perna da direita da tela cruza, e volta
    pernaE: [
      [0.85, { rx: 0, rz: 0 }],
      [1.0, { rx: 14, rz: 6 }],
      [1.16, { rx: 0, rz: 2 }, 'impacto'],
      [1.4, { rz: 0 }],
    ],
    pernaD: [
      [1.2, { rx: 0, rz: 0 }],
      [1.34, { rx: -10, rz: 5 }],
      [1.48, { rx: 0, rz: 0 }, 'impacto'],
    ],
    capa: [
      [0.4, { rx: -6 }],
      [0.85, { rx: -2 }],
      [1.3, { rx: -8 }],
    ],
  },
};

/*
 * O tombo, comum às duas causas. Começa já pendendo para a esquerda da tela:
 *
 *   0–0,8    pula num pé só para se pôr embaixo do corpo, abanando os braços
 *            para os lados, e a outra perna se debatendo
 *   0,8–1,28 o peso vai para trás, ele se joga para a frente e cai sentado,
 *            acelerando (impacto aos 1,28), virando um pouco de lado
 *   1,28–1,7 o pouso: achata, quica, as pernas batem e a cabeça chicoteia
 *   1,7–3,4  sentado, apoiado nas mãos: zonzo, e então balança a cabeça
 *   3,4–4,6  se levanta: recua, se joga para a frente e sobe
 *   4,6–5,6  limpa a calça, olha para quem viu e assenta
 */
const TOMBO: Trecho = {
  dur: 5.6,
  partes: {
    corpo: [
      [0, { rz: -11, x: -0.6, y: 0, sq: 0, ry: 0 }],
      [0.16, { rz: -7, x: -1.1, y: -0.8 }],
      [0.3, { rz: -13, x: -1.6, y: 0 }, 'impacto'],
      [0.46, { rz: -8, x: -2, y: -0.7 }],
      [0.6, { rz: -15, x: -2.4, y: 0 }, 'impacto'],
      [0.8, { rz: -6, x: -2.6, ry: 6 }],
      [0.96, { rz: -2, ry: 12 }],
      [1.28, { rz: 1, ry: 20, sq: 0.14, y: 0 }, 'impacto'],
      [1.4, { rz: 0, sq: -0.04, y: -1.2 }],
      [1.52, { sq: 0.05, y: 0 }, 'impacto'],
      [1.64, { sq: 0 }],
      [2.3, { ry: 17 }],
      [3.0, { ry: 21, x: -2.6 }],
      [3.4, { ry: 18 }],
      [4.1, { ry: 5, x: -1 }],
      [4.5, { ry: 0, x: -0.3, sq: -0.03 }],
      [4.75, { sq: 0.02, x: 0 }],
      [5.0, { sq: 0 }],
    ],
    sentar: [
      [0.8, { rx: 0 }],
      [0.96, { rx: 5 }],
      [1.28, { rx: 84 }, 'impacto'],
      [1.4, { rx: 72 }],
      [1.52, { rx: 82 }, 'impacto'],
      [1.64, { rx: 80 }],
      [3.1, { rx: 80 }],
      [3.32, { rx: 83 }],
      [3.6, { rx: 72 }],
      [4.2, { rx: 8 }],
      [4.45, { rx: -3 }],
      [4.75, { rx: 0 }],
    ],
    pernaD: [
      [0.3, { rz: 3, rx: 0, ry: 0 }],
      [0.6, { rz: 4 }],
      [0.96, { rz: 0 }],
      [1.28, { ry: -10, rz: 4, rx: 0 }],
      [1.38, { rx: 14 }],
      [1.52, { rx: 0 }, 'impacto'],
      [2.0, { ry: -10 }],
      [2.2, { ry: -16 }],
      [2.45, { ry: -9 }],
      [3.1, { ry: -10, rz: 4 }],
      [3.6, { ry: -6, rz: 2 }],
      [4.3, { ry: 0, rz: 0 }],
    ],
    pernaE: [
      [0, { rz: -4, rx: 0, ry: 0 }],
      [0.16, { rz: -14, rx: 18 }],
      [0.3, { rz: -8, rx: -10 }],
      [0.46, { rz: -18, rx: 22 }],
      [0.6, { rz: -10, rx: -6 }],
      [0.8, { rz: -6, rx: 10 }],
      [0.96, { rz: -2, rx: 0 }],
      [1.28, { ry: 10, rz: -4, rx: 0 }],
      [1.38, { rx: 18 }],
      [1.52, { rx: 0 }, 'impacto'],
      [2.1, { ry: 10 }],
      [2.3, { ry: 15 }],
      [2.55, { ry: 9 }],
      [3.1, { ry: 10, rz: -4 }],
      [3.6, { ry: 6, rz: -2 }],
      [4.3, { ry: 0, rz: 0 }],
    ],
    alto: [
      [0, { rz: -4, rx: 0, ry: 0 }],
      [0.16, { rz: 6, rx: -6 }],
      [0.3, { rz: -2, rx: 4 }],
      [0.46, { rz: 8, rx: -8 }],
      [0.6, { rz: -3, rx: 6 }],
      [0.8, { rz: 2, rx: -10 }],
      [0.96, { rz: 0, rx: -15 }],
      [1.2, { rx: -18 }],
      [1.3, { rx: -8 }],
      [1.42, { rx: 16 }],
      [1.6, { rx: 6 }],
      [1.85, { rx: 11 }],
      [2.5, { rx: 9, ry: 0 }],
      [2.72, { ry: -3 }],
      [2.94, { ry: 3 }],
      [3.14, { ry: 0, rx: 12 }],
      [3.34, { rx: 17 }],
      [3.66, { rx: -36 }],
      [4.2, { rx: -14 }],
      [4.48, { rx: 4 }],
      [4.62, { rx: -6 }],
      [4.95, { rx: -2 }],
    ],
    cabeca: [
      [0, { rx: -6, rz: -2, ry: 0 }],
      [0.18, { rx: -2, rz: -7 }],
      [0.34, { rx: -10, rz: 6 }],
      [0.5, { rz: -8 }],
      [0.66, { rx: -6, rz: 6 }],
      [0.9, { rx: 4, rz: 0 }],
      [1.18, { rx: 10 }],
      [1.32, { rx: 15 }],
      [1.46, { rx: -18 }],
      [1.64, { rx: -4 }],
      [1.84, { rx: -12 }],
      // zonzo: a cabeça roda devagar
      [2.04, { rz: 6, rx: -15 }],
      [2.24, { rz: -5, rx: -10 }],
      [2.44, { rz: 3, rx: -16 }],
      // e balança, para espantar a tontura
      [2.58, { rz: 0, rx: -20, ry: 0 }],
      [2.72, { ry: 24 }],
      [2.88, { ry: -24 }],
      [3.03, { ry: 18 }],
      [3.17, { ry: -11 }],
      [3.3, { ry: 4 }],
      [3.42, { ry: 0, rx: -15 }],
      [3.66, { rx: -4 }],
      [4.15, { rx: 2 }],
      // olha a calça que limpa, e depois para quem viu, sem graça
      [4.5, { rx: -12, rz: 0 }],
      [4.95, { rx: 3, rz: 8 }],
      [5.25, { rx: 1, rz: 6 }],
    ],
    // os braços abanam para os lados, um subindo enquanto o outro desce, e nunca na frente do
    // rosto: girando para a frente (`rx` acima de 90°) eles passavam pela cara, e lia como tapa
    bracoD: [
      [0, { rz: 120, rx: 0, ry: 0 }],
      [0.14, { rz: 150, rx: -20 }],
      [0.3, { rz: 75, rx: 25 }],
      [0.45, { rz: 145, rx: -25 }],
      [0.6, { rz: 70, rx: 20 }],
      [0.8, { rz: 130, rx: -15 }],
      [1.0, { rz: 95, rx: 30 }],
      [1.2, { rz: 70, rx: 40 }],
      [1.31, { rz: 18, rx: -26 }, 'impacto'],
      [1.43, { rx: -10 }],
      [1.62, { rz: 16, rx: -32 }],
      [2.5, { rz: 16, rx: -29 }],
      [3.1, { rx: -31 }],
      [3.34, { rx: -46 }],
      [3.68, { rz: 10, rx: 56 }],
      [4.2, { rz: 6, rx: 18 }],
      [4.42, { rz: 6, rx: -10 }],
      // dois tapas na calça
      [4.56, { rz: 10, rx: -40 }],
      [4.66, { rx: -22 }],
      [4.77, { rx: -42 }],
      [4.88, { rx: -20 }],
      [5.1, { rz: 2, rx: -6 }],
    ],
    bracoE: [
      [0, { rz: -26, rx: 8, ry: 0 }],
      [0.14, { rz: -80, rx: 20 }],
      [0.3, { rz: -145, rx: -20 }],
      [0.45, { rz: -75, rx: 25 }],
      [0.6, { rz: -150, rx: -25 }],
      [0.8, { rz: -95, rx: 15 }],
      [1.0, { rz: -95, rx: 30 }],
      [1.2, { rz: -70, rx: 40 }],
      [1.31, { rz: -18, rx: -26 }, 'impacto'],
      [1.43, { rx: -10 }],
      [1.62, { rz: -16, rx: -32 }],
      [2.5, { rz: -16, rx: -30 }],
      [3.1, { rx: -30 }],
      [3.34, { rx: -46 }],
      [3.68, { rz: -10, rx: 56 }],
      [4.2, { rz: -6, rx: 18 }],
      [4.45, { rz: -4, rx: -6 }],
      [4.75, { rz: -3, rx: 3 }],
    ],
    capa: [
      [0, { rx: -6 }],
      [0.22, { rx: -14 }],
      [0.4, { rx: -5 }],
      [0.62, { rx: -16 }],
      [0.92, { rx: -9 }],
      [1.24, { rx: -42 }],
      [1.36, { rx: -14 }],
      [1.5, { rx: -30 }],
      [1.75, { rx: -44 }],
      [3.3, { rx: -44 }],
      [3.7, { rx: -18 }],
      [4.25, { rx: -12 }],
      [4.55, { rx: 5 }],
      [4.85, { rx: -4 }],
    ],
  },
};

const CENAS: Record<NomeCena, Trecho[]> = {
  acenar: [ACENO, TOMBO],
  tonto: [TONTURA, TOMBO],
};

interface Ponto {
  t: number;
  v: number;
  impacto: boolean;
}

/**
 * A curva que passa pelas chaves: Hermite cúbica, com as tangentes do método de
 * Steffen. Ela não passa do ponto entre duas chaves (uma pose segurada fica
 * parada), freia sozinha onde o valor muda de sentido, e atravessa sem frear
 * onde ele continua indo. Num impacto ela chega acelerando, como quem cai (a
 * tangente de chegada é o dobro da média do trecho, que de uma pose parada dá a
 * parábola da gravidade), e para seco.
 */
function curva(pontos: Ponto[]) {
  const n = pontos.length;
  const media = pontos.slice(1).map((p, i) => (p.v - pontos[i].v) / (p.t - pontos[i].t));
  const chega = new Array<number>(n).fill(0);
  const sai = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    if (pontos[i].impacto) {
      chega[i] = 2 * media[i - 1];
      continue;
    }
    if (i === n - 1) continue;
    const a = media[i - 1];
    const b = media[i];
    if (a * b <= 0) continue;
    const ha = pontos[i].t - pontos[i - 1].t;
    const hb = pontos[i + 1].t - pontos[i].t;
    const p = (a * hb + b * ha) / (ha + hb);
    chega[i] = sai[i] = 2 * Math.sign(a) * Math.min(Math.abs(a), Math.abs(b), Math.abs(p) / 2);
  }
  let i = 0;
  return (t: number) => {
    if (t <= pontos[0].t) return pontos[0].v;
    if (t >= pontos[n - 1].t) return pontos[n - 1].v;
    // as amostras vêm em ordem: o trecho só anda para a frente
    while (t > pontos[i + 1].t) i++;
    while (t < pontos[i].t) i--;
    const p0 = pontos[i];
    const p1 = pontos[i + 1];
    const h = p1.t - p0.t;
    const s = (t - p0.t) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * p0.v +
      (s3 - 2 * s2 + s) * h * sai[i] +
      (3 * s2 - 2 * s3) * p1.v +
      (s3 - s2) * h * chega[i + 1]
    );
  };
}

/** O valor de um canal de uma parte, num instante; a parte que a cena não move fica em repouso. */
type Ler = (parte: Parte, canal: Canal, t: number) => number;

/** As chaves dos trechos, em sequência, e o repouso no começo e no fim de cada canal. */
function montar(trechos: Trecho[]) {
  const dur = trechos.reduce((soma, t) => soma + t.dur, 0);
  const curvas = new Map<string, (t: number) => number>();
  const nomes = new Set(trechos.flatMap((t) => Object.keys(t.partes) as Parte[]));
  for (const parte of nomes) {
    const canais = new Map<Canal, Ponto[]>();
    let inicio = 0;
    for (const trecho of trechos) {
      for (const [t, pose, impacto] of trecho.partes[parte] ?? []) {
        for (const [canal, v] of Object.entries(pose) as [Canal, number][]) {
          if (!canais.has(canal)) canais.set(canal, []);
          canais.get(canal)!.push({ t: inicio + t, v, impacto: impacto === 'impacto' });
        }
      }
      inicio += trecho.dur;
    }
    for (const [canal, pontos] of canais) {
      if (pontos[0].t > 0) pontos.unshift({ t: 0, v: 0, impacto: false });
      if (pontos[pontos.length - 1].t < dur) pontos.push({ t: dur, v: 0, impacto: false });
      curvas.set(`${parte}.${canal}`, curva(pontos));
    }
  }
  const ler: Ler = (parte, canal, t) => curvas.get(`${parte}.${canal}`)?.(t) ?? 0;
  return { dur, ler };
}

const montadas = new Map<NomeCena, ReturnType<typeof montar>>();

const g = (v: number) => `${v.toFixed(2)}deg`;
const giro = (ler: Ler, parte: Parte, t: number) =>
  `rotateY(${g(ler(parte, 'ry', t))}) rotateX(${g(ler(parte, 'rx', t))}) rotateZ(${g(ler(parte, 'rz', t))})`;
const braco = (ler: Ler, parte: Parte, t: number) =>
  `rotateZ(${g(ler(parte, 'rz', t))}) rotateX(${g(ler(parte, 'rx', t))}) rotateY(${g(ler(parte, 'ry', t))})`;
const rad = (graus: number) => (graus * Math.PI) / 180;

/**
 * As pernas: o giro de cada uma soma com `sentar`, o das duas. Sentar e levantar
 * são uma conta só: as pernas giram `sentar` para a frente em volta do quadril,
 * e o quadril desce e recua o que for preciso para os pés não saírem do lugar.
 * Ele cai como uma tábua que gira em volta dos pés, que é como se cai sentado de
 * pernas esticadas (o modelo não tem joelho).
 */
const perna = (ler: Ler, parte: Parte, t: number) =>
  `rotateY(${g(ler(parte, 'ry', t))}) rotateX(${g(ler('sentar', 'rx', t) + ler(parte, 'rx', t))}) rotateZ(${g(
    ler(parte, 'rz', t),
  )})`;

type Px = (texels: number) => string;

/**
 * Como os canais de cada nó viram `transform`, pelo `data-cena` do nó
 * (`modelo.tsx`). São os nós dos gestos, por dentro dos que o comportamento
 * move: o `transform` deles está livre. A capa tem o dela no CSS, e recebe
 * `rotate`.
 */
const NOS: [string, 'transform' | 'rotate', (ler: Ler, t: number, px: Px) => string][] = [
  [
    'corpo',
    'transform',
    (ler, t, px) => {
      const rz = ler('corpo', 'rz', t);
      const sq = ler('corpo', 'sq', t);
      // inclina sobre o pé do lado para onde pende; com o giro em zero, o pé não importa
      const pe = rz < 0 ? -PE : PE;
      const largo = (1 + sq / 2).toFixed(3);
      return (
        `translate3d(${px(ler('corpo', 'x', t))}, ${px(ler('corpo', 'y', t))}, 0) ` +
        `translateX(${px(pe)}) rotateZ(${g(rz)}) translateX(${px(-pe)}) ` +
        `rotateY(${g(ler('corpo', 'ry', t))}) rotateX(${g(ler('corpo', 'rx', t))}) ` +
        `scale3d(${largo}, ${(1 - sq).toFixed(3)}, ${largo})`
      );
    },
  ],
  [
    'quadril',
    'transform',
    (ler, t, px) => {
      const s = rad(ler('sentar', 'rx', t));
      return `translate3d(0, ${px(PERNA * (1 - Math.cos(s)))}, ${px(-PERNA * Math.sin(s))})`;
    },
  ],
  ['alto', 'transform', (ler, t) => giro(ler, 'alto', t)],
  ['cabeca', 'transform', (ler, t) => giro(ler, 'cabeca', t)],
  ['bracoD', 'transform', (ler, t) => braco(ler, 'bracoD', t)],
  ['bracoE', 'transform', (ler, t) => braco(ler, 'bracoE', t)],
  ['pernaD', 'transform', (ler, t) => perna(ler, 'pernaD', t)],
  ['pernaE', 'transform', (ler, t) => perna(ler, 'pernaE', t)],
  ['capa', 'rotate', (ler, t) => `x ${g(ler('capa', 'rx', t))}`],
];

export interface Cena {
  /** `true` quando a cena termina sozinha, `false` quando é interrompida */
  fim: Promise<boolean>;
  /** interrompe: de uma vez, ou voltando ao repouso em 0,3s */
  parar(suave: boolean): void;
}

/** Toca uma cena nos nós do boneco que mora em `palco`. */
export function tocar(palco: HTMLElement, nome: NomeCena): Cena {
  if (!montadas.has(nome)) montadas.set(nome, montar(CENAS[nome]));
  const { dur, ler } = montadas.get(nome)!;
  // o texel de agora: as medidas da cena são em texels, e ele muda com a tela
  const texel = parseFloat(getComputedStyle(palco).getPropertyValue('--px')) || 6;
  const px: Px = (n) => `${(n * texel).toFixed(2)}px`;
  const total = Math.round(dur * QUADROS);
  const animacoes: [HTMLElement, 'transform' | 'rotate', Animation][] = [];
  for (const [nome, prop, valor] of NOS) {
    const no = palco.querySelector<HTMLElement>(`[data-cena="${nome}"]`);
    if (!no) continue;
    const quadros = Array.from({ length: total + 1 }, (_, k) => ({ [prop]: valor(ler, (k / total) * dur, px) }));
    animacoes.push([no, prop, no.animate(quadros, { duration: dur * 1000, easing: 'linear' })]);
  }
  return {
    fim: Promise.all(animacoes.map(([, , a]) => a.finished)).then(
      () => true,
      () => false,
    ),
    parar(suave) {
      for (const [no, prop, a] of animacoes) {
        const agora = getComputedStyle(no)[prop];
        a.cancel();
        if (suave) {
          no.animate([{ [prop]: agora }, { [prop]: prop === 'rotate' ? 'x 0deg' : 'none' }], {
            duration: 300,
            easing: 'ease-out',
          });
        }
      }
    },
  };
}
