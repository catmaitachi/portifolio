import { fastCos, fastSin, TAU } from '../math';
import { campoVazio, prepararCampo, puxar, type Campo } from '../gravity';

/**
 * Raio abaixo do qual a estrela é desenhada como quadrado. Em menos de 2px de
 * diâmetro, círculo e quadrado ocupam os mesmos pixels — e o quadrado custa
 * quatro retas contra as quatro curvas do `arc`.
 */
const R_QUADRADO = 1;
import type { Layer, StageEnv } from '../types';

/**
 * Deriva ambiente: quanto cada estrela vagueia em volta do próprio repouso, em px.
 *
 * Ela vive só no `draw`, nunca no `sdx`/`sdy`. Somada ao deslocamento ela entraria
 * na mola, no puxão e no teste do streak, e um céu que respira viraria um céu que
 * está sempre sendo puxado.
 */
const DRIFT_AMP = 0.9;
/** Mais lento que o cintilar (`sspd` vai de 0.3 a 1.05): é ambiente, não pulso. */
const DRIFT_SPEED = 0.16;

/**
 * Raio a partir do qual a estrela ganha brilho em cruz.
 *
 * É o **começo real da faixa grande** do `resize` (1.1 + rand·0.9), não o
 * `R_QUADRADO`: com 1 entrariam também as pequenas entre 1.0 e 1.05, e a cruz
 * deixaria de ser a marca das maiores.
 */
const FLARE_MIN = 1.1;
/** Comprimento de cada braço, em raios. */
const FLARE_LEN = 2.4;
/** A decoração sai por baixo da opacidade do balde: ela confirma o ponto, não o disputa. */
const DECORACAO_ALPHA = 0.5;

/** Abaixo disto o deslocamento é jitter da mola, não puxão: não vira traço. */
const STREAK_MAG_MIN = 16;
const STREAK_MAG_MIN2 = STREAK_MAG_MIN * STREAK_MAG_MIN;
/**
 * O traço é **uma fração** do deslocamento, não o deslocamento inteiro.
 *
 * Perto do horizonte o puxão satura na casa dos 200px (`k·raio·5.28/2.6`), e
 * desenhar o deslocamento cru punha **60% dos traços no teto**: todos do mesmo
 * tamanho, o que apaga justamente a informação que o traço existe para dar, quem
 * está sendo puxado com mais força. Com o ganho, medido no céu do Início, o
 * comprimento vai de 14px a 46px com mediana em 38, e só 28% encostam no teto.
 * Esses 28% são o miolo, onde a física realmente satura.
 */
const STREAK_GANHO = 0.2;
/** Teto do traço, em px. Sem ele a saturação perto do horizonte vira risco. */
const STREAK_LEN_MAX = 46;

/**
 * A estrela está dentro do alcance de uma gravidade **de verdade**?
 *
 * O streak existe para mostrar o buraco negro e a carga da supernova puxando o
 * céu. A repulsão do ponteiro também desloca, e bastante, mas ela é o cursor
 * afastando estrelas, e estirar a estrela ali leria como rastro de mouse.
 *
 * Função pura sobre os dois campos que o quadro já preparou, então vive no escopo
 * do módulo (a mesma regra de `encaixeDe`/`fracaoDe` no `NavMenu`).
 */
function dentroDoAlcance(
  x: number,
  y: number,
  campo: Campo,
  poco: Campo,
  temGrav: boolean,
  temPoco: boolean,
): boolean {
  if (temGrav) {
    const dx = x - campo.x;
    const dy = y - campo.y;
    if (dx * dx + dy * dy < campo.alcance2) return true;
  }
  if (temPoco) {
    const dx = x - poco.x;
    const dy = y - poco.y;
    if (dx * dx + dy * dy < poco.alcance2) return true;
  }
  return false;
}

interface StarfieldOptions {
  name?: string;
  z?: number;
  /** px² por estrela — a contagem acompanha a área da tela */
  density?: number;
  max?: number;
  /** níveis de opacidade: é também o número de `fill()` por quadro */
  buckets?: number;
  /** raio de repulsão do ponteiro, em px */
  repel?: number;
  twinkleAmount?: number;
}

/**
 * Campo de estrelas.
 *
 * Todas as posições vivem em TypedArrays criados no `resize` — nada é alocado
 * por quadro. As estrelas são agrupadas em `buckets` níveis de opacidade e cada
 * grupo vira um único `fill()`: 8 chamadas de desenho para ~1120 estrelas, em
 * vez de 1120 mudanças de `globalAlpha`.
 *
 * Lê `env.bus.gravity` (buraco negro), `env.bus.well` (a carga da supernova) e
 * `env.bus.shock` (a explosão dela) sem saber quem os publicou. Os três entram
 * como deslocamento, nunca como posição: a mola de volta ao repouso é a mesma
 * para todos e devolve o céu ao lugar sozinha.
 */
export function Starfield({
  name = 'stars',
  z = 10,
  density = 3250,
  max = 1120,
  buckets = 8,
  repel = 110,
  twinkleAmount = 0.22,
}: StarfieldOptions = {}): Layer {
  const R2 = repel * repel;
  let N = 0;
  let sx!: Float32Array;
  let sy!: Float32Array;
  let ssz!: Float32Array;
  let sbase!: Float32Array;
  let sph!: Float32Array;
  let sspd!: Float32Array;
  let sdx!: Float32Array;
  let sdy!: Float32Array;
  let bucket!: Int32Array;
  const count = new Int32Array(buckets);

  /**
   * O puxão vem de `engine/gravity`, não de uma tabela local.
   *
   * As estrelas que a supernova acende sentem a mesma gravidade, e elas ficam
   * lado a lado com estas no mesmo céu: se as contas divergirem, a diferença
   * salta aos olhos. O campo é preparado uma vez por quadro e reusado nas ~1120
   * estrelas.
   */
  const campo = campoVazio();
  /**
   * O segundo poço: a carga da supernova, enquanto o visitante segura o ponteiro.
   *
   * Ele é do mesmo tipo do primeiro e usa o mesmo `puxar`, então some do laço
   * sozinho quando o gesto termina. Sem carga o custo é a comparação de `temPoco`,
   * exatamente o que `temGrav` já custa fora do Início.
   */
  const poco = campoVazio();
  const puxao = { x: 0, y: 0 };
  /**
   * Os dois campos preparados sobrevivem ao `update` porque o `draw` também os
   * lê: é deles que sai o teste do streak. `update` roda sempre antes do `draw`
   * no mesmo quadro (ordem do array em `createStage`), então o que o desenho vê é
   * o campo deste quadro.
   */
  let temGrav = false;
  let temPoco = false;

  return {
    name,
    z,
    resize(env: StageEnv) {
      N = Math.min(max, Math.round((env.W * env.H) / density));
      bucket = new Int32Array(N * buckets);
      sx = new Float32Array(N);
      sy = new Float32Array(N);
      ssz = new Float32Array(N);
      sbase = new Float32Array(N);
      sph = new Float32Array(N);
      sspd = new Float32Array(N);
      sdx = new Float32Array(N);
      sdy = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        sx[i] = Math.random() * env.W;
        sy[i] = Math.random() * env.H;
        // 82% pequenas: um céu de pontos uniformes não lê como céu
        ssz[i] = Math.random() < 0.82 ? 0.55 + Math.random() * 0.5 : 1.1 + Math.random() * 0.9;
        sbase[i] = 0.3 + Math.random() * 0.7;
        sph[i] = Math.random() * TAU;
        sspd[i] = 0.3 + Math.random() * 0.75;
      }
    },
    update(env) {
      const { dt, t, mouse } = env;
      const moving = env.camera.moving;
      // durante o zoom da intro, repulsão e gravidade ficam desligadas
      const useMouse = mouse.active && !moving;
      temGrav = prepararCampo(moving ? null : env.bus.gravity, campo);
      temPoco = prepararCampo(moving ? null : env.bus.well, poco);
      // a onda também some durante o zoom da intro: empurrar um céu que ainda
      // está chegando não lê como onda, lê como tremor
      const onda = moving ? null : env.bus.shock;

      for (let b = 0; b < buckets; b++) count[b] = 0;

      for (let i = 0; i < N; i++) {
        let ox = sdx[i];
        let oy = sdy[i];

        if (useMouse) {
          const dx = sx[i] + ox - mouse.x;
          const dy = sy[i] + oy - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / repel) * 26;
            ox += (dx / d) * f * dt * 6;
            oy += (dy / d) * f * dt * 6;
          }
        }
        // mola de volta ao repouso: sem ela o deslocamento seria permanente
        ox -= ox * dt * 2.6;
        oy -= oy * dt * 2.6;

        if (temGrav) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(campo, sx[i] + ox, sy[i] + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }
        if (temPoco) {
          puxao.x = 0;
          puxao.y = 0;
          puxar(poco, sx[i] + ox, sy[i] + oy, dt, puxao);
          ox += puxao.x;
          oy += puxao.y;
        }
        if (onda) {
          const wx = sx[i] + ox - onda.x;
          const wy = sy[i] + oy - onda.y;
          const w2 = wx * wx + wy * wy;
          // só o anel da frente de onda empurra; o miolo já foi varrido
          if (w2 < onda.outer2 && w2 > onda.inner2) {
            const wd = Math.sqrt(w2) || 1e-4;
            // crista no raio, zero nas duas bordas do anel
            const perfil = 1 - Math.abs(wd - onda.radius) / onda.width;
            if (perfil > 0) {
              const imp = onda.force * perfil * dt;
              ox += (wx / wd) * imp;
              oy += (wy / wd) * imp;
            }
          }
        }

        sdx[i] = ox;
        sdy[i] = oy;

        // LUT, não `Math.sin`: isto roda uma vez por estrela por quadro, e são
        // ~1120 delas — é o laço mais quente da cena inteira
        const a = sbase[i] * (1 - twinkleAmount + twinkleAmount * fastSin(t * sspd[i] + sph[i]));
        let b = (a * buckets) | 0;
        if (b >= buckets) b = buckets - 1;
        else if (b < 0) b = 0;
        bucket[b * N + count[b]++] = i;
      }
    },
    draw(ctx, env) {
      const { W, H, cx, cy, t } = env;
      const zk = env.camera.k;
      const zooming = env.camera.moving;
      ctx.fillStyle = '#fff';
      for (let b = 0; b < buckets; b++) {
        const n = count[b];
        if (!n) continue;
        ctx.globalAlpha = (b + 0.5) / buckets;
        ctx.beginPath();
        const off = b * N;
        for (let k = 0; k < n; k++) {
          const i = bucket[off + k];
          let px = sx[i] + sdx[i];
          let py = sy[i] + sdy[i];
          if (zooming) {
            px = cx + (px - cx) * zk;
            py = cy + (py - cy) * zk;
          } else {
            /**
             * A deriva só existe fora do zoom da intro.
             *
             * Um céu que ainda está chegando não lê como ambiente, lê como tremor
             * (é a mesma razão pela qual o ponteiro e a gravidade também somem
             * ali). E ela entra **depois** da transformação da câmera: antes, o
             * zoom a multiplicaria por 26.
             */
            px += DRIFT_AMP * fastCos(t * DRIFT_SPEED + sph[i]);
            py += DRIFT_AMP * fastSin(t * DRIFT_SPEED + sph[i] * 1.3);
          }
          if (px < -8 || px > W + 8 || py < -8 || py > H + 8) continue;
          const r = ssz[i];
          /**
           * Estrela pequena vira quadrado.
           *
           * `arc` desenha um círculo com quatro curvas de Bézier; `rect`, com
           * quatro retas. Abaixo de `R_QUADRADO` a estrela tem menos de 2px de
           * diâmetro e as duas formas caem nos mesmos pixels — e **82% delas
           * estão nessa faixa** (ver a distribuição no `resize`). Os dois entram
           * no mesmo path, então continua um `fill()` por balde.
           */
          if (r < R_QUADRADO) {
            const d = r + r;
            ctx.rect(px - r, py - r, d, d);
            continue;
          }
          // moveTo antes do arc: sem ele o subcaminho anterior se liga a este
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, TAU);
        }
        ctx.fill();

        /**
         * Passe 2: brilho em cruz e streak, **num `stroke()` só por balde**.
         *
         * O lote não é preciosismo. O alcance do buraco negro é `raio·6.2`, uns
         * 625px numa tela 1280×720, e o deslocamento de equilíbrio já passa dos
         * 16px em cerca de 60% dele: na seção Início quase metade das ~1120
         * estrelas é candidata a traço em qualquer quadro. Um `stroke()` por
         * estrela seriam centenas de chamadas de desenho o tempo todo; assim são
         * 8, e o número não depende de quantas estrelas estão sendo puxadas.
         *
         * `px`/`py` são recomputados em vez de guardados: um array a mais por
         * quadro é alocação, e a conta é a mesma do passe 1 (a mesma deriva, o
         * mesmo zoom e o mesmo corte de bordas), senão a cruz sai do lugar do ponto.
         */
        let temDecoracao = false;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const i = bucket[off + k];
          let px = sx[i] + sdx[i];
          let py = sy[i] + sdy[i];
          if (zooming) {
            px = cx + (px - cx) * zk;
            py = cy + (py - cy) * zk;
          } else {
            px += DRIFT_AMP * fastCos(t * DRIFT_SPEED + sph[i]);
            py += DRIFT_AMP * fastSin(t * DRIFT_SPEED + sph[i] * 1.3);
          }
          if (px < -8 || px > W + 8 || py < -8 || py > H + 8) continue;

          if (ssz[i] >= FLARE_MIN) {
            const len = ssz[i] * FLARE_LEN;
            ctx.moveTo(px - len, py);
            ctx.lineTo(px + len, py);
            ctx.moveTo(px, py - len);
            ctx.lineTo(px, py + len);
            temDecoracao = true;
          }

          if (temGrav || temPoco) {
            const dxi = sdx[i];
            const dyi = sdy[i];
            const mag2 = dxi * dxi + dyi * dyi;
            /**
             * Grande **e** dentro de um poço de verdade. Só o tamanho não basta:
             * a repulsão do ponteiro empurra na mesma ordem de grandeza, e um
             * traço atrás do cursor não é gravidade, é rastro de mouse.
             */
            if (
              mag2 > STREAK_MAG_MIN2 &&
              dentroDoAlcance(sx[i], sy[i], campo, poco, temGrav, temPoco)
            ) {
              const mag = Math.sqrt(mag2);
              const alvo = mag * STREAK_GANHO;
              const len = alvo < STREAK_LEN_MAX ? alvo : STREAK_LEN_MAX;
              // o traço fica atrás da estrela: é o caminho por onde ela veio
              ctx.moveTo(px - (dxi / mag) * len, py - (dyi / mag) * len);
              ctx.lineTo(px, py);
              temDecoracao = true;
            }
          }
        }
        if (temDecoracao) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#fff';
          // mais apagado que o ponto: a cruz e o traço são o que a estrela faz,
          // nunca a estrela. Uma linha de 1px na opacidade cheia do balde vira
          // desenho, e o que se vê são as pontas em vez do céu
          ctx.globalAlpha *= DECORACAO_ALPHA;
          ctx.stroke();
        }
      }
    },
  };
}
