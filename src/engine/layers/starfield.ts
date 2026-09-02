import { fastSin, TAU } from '../math';
import { campoVazio, prepararCampo, puxar } from '../gravity';

/**
 * Raio abaixo do qual a estrela é desenhada como quadrado. Em menos de 2px de
 * diâmetro, círculo e quadrado ocupam os mesmos pixels — e o quadrado custa
 * quatro retas contra as quatro curvas do `arc`.
 */
const R_QUADRADO = 1;
import type { Layer, StageEnv } from '../types';

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
 * Lê `env.bus.gravity` (buraco negro) e `env.bus.shock` (supernova) sem saber
 * quem os publicou. Os dois entram como deslocamento, nunca como posição: a mola
 * de volta ao repouso é a mesma para os dois e devolve o céu ao lugar sozinha.
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
  const puxao = { x: 0, y: 0 };

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
      const temGrav = prepararCampo(moving ? null : env.bus.gravity, campo);
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
      const { W, H, cx, cy } = env;
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
      }
    },
  };
}
