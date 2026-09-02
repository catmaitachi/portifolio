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
