import { TAU } from '../math';
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
 * Lê `env.bus.gravity` (publicada pelo buraco negro) sem saber quem a publicou.
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

  // LUT de gravidade: índice = (d/alcance)² · 255. Evita a divisão e a potência
  // por estrela — o perfil de queda é sempre o mesmo, só a escala muda.
  const GLUT = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const q = i / 255;
    const d = Math.sqrt(q) || 1e-4;
    GLUT[i] = Math.min(1, 0.055 / (d * d + 0.02)) * (1 - q);
  }

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
      const grav = moving ? null : env.bus.gravity;
      let INF2 = 0;
      let inv2 = 0;
      if (grav) {
        INF2 = grav.reach * grav.reach;
        inv2 = 255 / INF2;
      }

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

        if (grav) {
          const gx = grav.x - (sx[i] + ox);
          const gy = grav.y - (sy[i] + oy);
          const g2 = gx * gx + gy * gy;
          if (g2 < INF2) {
            const gi = GLUT[(g2 * inv2) | 0] * grav.k;
            const gd = Math.sqrt(g2) || 1e-4;
            const nx = gx / gd;
            const ny = gy / gd;
            const pull = gi * grav.radius * 2.4;
            // a componente perpendicular (·0.55) dá o giro do disco
            ox += (nx * pull - ny * pull * 0.55) * dt * 2.2;
            oy += (ny * pull + nx * pull * 0.55) * dt * 2.2;
          }
        }
        sdx[i] = ox;
        sdy[i] = oy;

        const a = sbase[i] * (1 - twinkleAmount + twinkleAmount * Math.sin(t * sspd[i] + sph[i]));
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
          // moveTo antes do arc: sem ele o subcaminho anterior se liga a este
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, TAU);
        }
        ctx.fill();
      }
    },
  };
}
