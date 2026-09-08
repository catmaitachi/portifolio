import type { Gravity } from './types';

/**
 * O puxão do buraco negro, num lugar só.
 *
 * Duas camadas sentem gravidade — o campo de estrelas e as estrelas que a
 * supernova acende — e elas **precisam concordar**, senão uma estrela acesa se
 * move diferente das vizinhas e a diferença salta aos olhos, porque elas estão
 * lado a lado no mesmo céu.
 *
 * Nenhuma camada importa a outra: as duas importam daqui. É o mesmo arranjo do
 * `env.bus`, onde o `BlackHole` publica e quem quiser lê, e resolve a
 * fragilidade que a repulsão do ponteiro ainda tem — lá os números estão
 * duplicados com uma nota pedindo que mudem juntos.
 *
 * A divisão em **preparar** e **puxar** existe pelo contrato de desempenho: o
 * campo de estrelas roda isto ~1120 vezes por quadro, e `reach²` e a recíproca
 * do alcance não podem ser recalculadas por estrela. Cada camada guarda o
 * próprio `Campo` e o próprio destino, então nada aqui é estado compartilhado.
 */
export interface Campo {
  x: number;
  y: number;
  k: number;
  radius: number;
  /** alcance², para o teste de distância sair sem raiz */
  alcance2: number;
  /** 255 / alcance², o fator que leva a distância ao índice da tabela */
  escala: number;
}

/** Deslocamento acumulado, em px. Quem chama é dono do seu. */
export interface Desloc {
  x: number;
  y: number;
}

/**
 * Perfil de queda, tabelado: índice = (d/alcance)² · 255.
 *
 * Evita uma divisão e uma potência por estrela — o formato da curva é sempre o
 * mesmo, só a escala muda com o raio do horizonte.
 */
const QUEDA = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const q = i / 255;
  const d = Math.sqrt(q) || 1e-4;
  QUEDA[i] = Math.min(1, 0.055 / (d * d + 0.02)) * (1 - q);
}

/** Ganho do puxão sobre o raio do horizonte. */
const GANHO = 2.4;

/** Componente perpendicular: é ela que dá o giro do disco em vez de queda reta. */
const GIRO = 0.55;

/** Quanto do puxão entra por segundo. */
const RITMO = 2.2;

export const campoVazio = (): Campo => ({
  x: 0,
  y: 0,
  k: 0,
  radius: 0,
  alcance2: 0,
  escala: 0,
});

/**
 * Prepara o campo do quadro. Devolve `false` quando não há gravidade agora, e é
 * esse `false` que a camada usa para pular o trabalho inteiro.
 */
export function prepararCampo(g: Gravity | null | undefined, campo: Campo): boolean {
  if (!g) return false;
  campo.x = g.x;
  campo.y = g.y;
  campo.k = g.k;
  campo.radius = g.radius;
  campo.alcance2 = g.reach * g.reach;
  campo.escala = 255 / campo.alcance2;
  return true;
}

/**
 * Soma em `fora` o puxão sobre o ponto (px, py).
 *
 * Fora do alcance não faz nada, e o teste é em distância ao quadrado: a raiz só
 * é tirada para quem está dentro.
 */
export function puxar(campo: Campo, px: number, py: number, dt: number, fora: Desloc): void {
  const gx = campo.x - px;
  const gy = campo.y - py;
  const g2 = gx * gx + gy * gy;
  if (g2 >= campo.alcance2) return;

  const forca = QUEDA[(g2 * campo.escala) | 0] * campo.k;
  const d = Math.sqrt(g2) || 1e-4;
  const nx = gx / d;
  const ny = gy / d;
  const pull = forca * campo.radius * GANHO;
  fora.x += (nx * pull - ny * pull * GIRO) * dt * RITMO;
  fora.y += (ny * pull + nx * pull * GIRO) * dt * RITMO;
}

/**
 * Raio da zona de captura por unidade de `k`, em px.
 *
 * Sai do próprio campo em vez de virar parâmetro: o `k` do poço já cresce com o
 * nível da carga, então no nível 1 quase nada é capturado e no 4 um disco inteiro
 * se junta, sem nenhum número novo atravessando o barramento.
 */
const CAPTURA_POR_K = 70;

/**
 * Teto do raio de captura, em px.
 *
 * O `k` publicado leva o pico do colapso junto (mais de três vezes o valor
 * saturado), e sem teto a zona inflaria para quase mil pixels no pior instante.
 * O problema não é o alcance, é a curva: com `g²` medido contra um raio enorme,
 * quem está a duzentos pixels vira "quase na borda" e passa a convergir devagar —
 * exatamente durante o momento em que a sucção deveria ser mais brutal.
 */
const CAPTURA_MAX = 260;

/** Quanto da distância que falta a captura fecha por segundo, no miolo. */
const CAPTURA_RITMO = 10;

/**
 * Prende no centro o que já caiu fundo demais para orbitar.
 *
 * **O alvo é o centro exato, não mais uma força.** Somar força só mudaria o raio de
 * equilíbrio contra a mola de quem chama, e é justamente esse equilíbrio que
 * produz a órbita: a estrela cai, a mola segura, e ela fica girando num anel. A
 * captura move o deslocamento na direção do que a levaria ao centro, então ela
 * converge e para — que é o que uma estrela absorvida faz.
 *
 * **A força cresce para dentro** (`g²`, zero na borda da zona): perto do limite a
 * captura quase não se nota e a órbita ainda vale, no miolo ela domina a mola e
 * prende. Sem isso haveria uma circunferência visível separando "girando" de
 * "preso".
 *
 * **Só o poço da supernova chama isto.** No buraco negro o giro é o disco de
 * acreção, que é o efeito desejado — lá as estrelas devem continuar orbitando.
 */
export function capturar(campo: Campo, px: number, py: number, dt: number, fora: Desloc): void {
  const bruto = campo.k * CAPTURA_POR_K;
  const raio = bruto > CAPTURA_MAX ? CAPTURA_MAX : bruto;
  const gx = campo.x - px;
  const gy = campo.y - py;
  const g2 = gx * gx + gy * gy;
  const r2 = raio * raio;
  if (g2 >= r2) return;

  const g = 1 - g2 / r2;
  let taxa = g * g * dt * CAPTURA_RITMO;
  if (taxa > 1) taxa = 1;
  fora.x += gx * taxa;
  fora.y += gy * taxa;
}

/**
 * O quanto uma estrela está presa: 0 fora da zona, 1 no centro dela.
 *
 * Quem desenha precisa disto, e não só quem move. Uma estrela capturada tem
 * deslocamento **enorme** — ele vale exatamente o vetor que a levou ao centro — e
 * sem esta consulta o desenho a trataria como a mais puxada de todas: esticada
 * num rastro comprido e ainda tremendo com a deriva ambiente. Só que ela não se
 * move mais, e o que não se move não borra nem respira.
 *
 * Repete as quatro linhas de `capturar` em vez de fatorá-las: as duas rodam uma vez
 * por estrela por quadro, e um valor de retorno a mais no caminho quente custaria
 * mais que a repetição.
 */
export function capturado(campo: Campo, px: number, py: number): number {
  const bruto = campo.k * CAPTURA_POR_K;
  const raio = bruto > CAPTURA_MAX ? CAPTURA_MAX : bruto;
  const gx = campo.x - px;
  const gy = campo.y - py;
  const g2 = gx * gx + gy * gy;
  const r2 = raio * raio;
  if (g2 >= r2) return 0;
  return 1 - g2 / r2;
}
