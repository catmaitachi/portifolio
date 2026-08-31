import type { ConstellationKey } from '../catalog/constellations';
import { CONSTELLATIONS } from '../catalog/constellations';
import { TAU } from '../math';
import type { FadableLayer, StageEnv } from '../types';

/** Onde uma figura do catálogo aparece na tela. */
export interface Placement {
  key: ConstellationKey;
  /** centro em fração da largura/altura */
  x: number;
  y: number;
  /** tamanho da maior dimensão, em fração de min(W,H) */
  size?: number;
  /** graus, no sentido horário */
  rotate?: number;
  flip?: boolean;
}

interface ConstellationsOptions {
  name?: string;
  z?: number;
  placements?: readonly Placement[];
  lineAlpha?: number;
  opacity?: number;
  repel?: number;
  twinkleAmount?: number;
  buckets?: number;
}

export interface ConstellationsLayer extends FadableLayer {
  /** 0..1 — multiplica linhas e estrelas; em 0 a camada custa zero */
  opacity: number;
  /** opacidade base das linhas, antes de `opacity` e do fade da câmera */
  lineAlpha: number;
}

/**
 * Constelações.
 *
 * As estrelas herdam as propriedades do `Starfield` (tamanho por magnitude,
 * cintilar, repulsão do ponteiro) e as linhas saem num único `stroke()` para a
 * camada inteira.
 *
 * `opacity` é a alavanca de presença: em 0 a camada sai do `update` **e** do
 * `draw`. É o que permite manter quatro céus montados ao mesmo tempo — só o da
 * seção ativa custa alguma coisa.
 */
export function Constellations({
  name = 'constellations',
  z = 12,
  placements = [],
  lineAlpha = 0.16,
  opacity = 1,
  repel = 110,
  twinkleAmount = 0.22,
  buckets = 6,
}: ConstellationsOptions = {}): ConstellationsLayer {
  const R2 = repel * repel;
  let N = 0;
  let px_!: Float32Array;
  let py_!: Float32Array;
  let vx_!: Float32Array; // posições do quadro, reaproveitadas
  let vy_!: Float32Array;
  let sz!: Float32Array;
  let base!: Float32Array;
  let ph!: Float32Array;
  let spd!: Float32Array;
  let dx_!: Float32Array;
  let dy_!: Float32Array;
  let edges: Int32Array = new Int32Array(0);
  let bucket!: Int32Array;
  const count = new Int32Array(buckets);

  return {
    name,
    z,
    lineAlpha,
    opacity,
    resize(env: StageEnv) {
      const { W, H } = env;
      const pts: [number, number, number][] = [];
      const eds: number[] = [];

      for (const p of placements) {
        const spec = CONSTELLATIONS[p.key];
        if (!spec) continue;
        const off = pts.length;

        // Projeção equirretangular: a RA cresce para leste (esquerda no céu) e
        // encolhe por cos(dec) na latitude média da figura — sem isso uma
        // constelação polar sairia esticada na horizontal.
        const decs = spec.stars.map((s) => s[1]);
        const decMid = (Math.min(...decs) + Math.max(...decs)) / 2;
        const kx = 15 * Math.cos((decMid * Math.PI) / 180);
        const proj = spec.stars.map(([ra, dec]) => [-ra * kx, -dec] as const);

        const xs = proj.map((q) => q[0]);
        const ys = proj.map((q) => q[1]);
        const x0 = Math.min(...xs);
        const x1 = Math.max(...xs);
        const y0 = Math.min(...ys);
        const y1 = Math.max(...ys);
        // normaliza pela maior dimensão: `size` vale para a figura toda
        const unit = (Math.min(W, H) * (p.size ?? 0.22)) / Math.max(x1 - x0, y1 - y0);
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;

        const rot = ((p.rotate ?? 0) * Math.PI) / 180;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const fx = p.flip ? -1 : 1;

        // magnitude aparente → brilho relativo 0..1 dentro da própria figura
        const mags = spec.stars.map((s) => s[2]);
        const mLo = Math.min(...mags);
        const mHi = Math.max(...mags);
        const span = Math.max(0.001, mHi - mLo);

        proj.forEach(([qx, qy], i) => {
          const ax = (qx - mx) * unit * fx;
          const ay = (qy - my) * unit;
          pts.push([
            W * p.x + (ax * cos - ay * sin),
            H * p.y + (ax * sin + ay * cos),
            1 - (spec.stars[i][2] - mLo) / span,
          ]);
        });
        for (const [a, b] of spec.links) eds.push(off + a, off + b);
      }

      N = pts.length;
      edges = new Int32Array(eds);
      bucket = new Int32Array(Math.max(1, N) * buckets);
      px_ = new Float32Array(N);
      py_ = new Float32Array(N);
      vx_ = new Float32Array(N);
      vy_ = new Float32Array(N);
      sz = new Float32Array(N);
      base = new Float32Array(N);
      ph = new Float32Array(N);
      spd = new Float32Array(N);
      dx_ = new Float32Array(N);
      dy_ = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        px_[i] = pts[i][0];
        py_[i] = pts[i][1];
        const mag = pts[i][2];
        // mesma faixa do Starfield, enviesada pelo brilho catalogado
        sz[i] = 0.55 + mag * 0.95;
        base[i] = 0.32 + mag * 0.62;
        ph[i] = Math.random() * TAU;
        spd[i] = 0.3 + Math.random() * 0.75;
      }
    },
    update(env) {
      if (!N || this.opacity <= 0.002) return; // camada invisível custa zero
      const { dt, t, mouse } = env;
      const useMouse = mouse.active && !env.camera.moving;
      for (let b = 0; b < buckets; b++) count[b] = 0;

      for (let i = 0; i < N; i++) {
        let ox = dx_[i];
        let oy = dy_[i];
        if (useMouse) {
          const ddx = px_[i] + ox - mouse.x;
          const ddy = py_[i] + oy - mouse.y;
          const d2 = ddx * ddx + ddy * ddy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / repel) * 26;
            ox += (ddx / d) * f * dt * 6;
            oy += (ddy / d) * f * dt * 6;
          }
        }
        ox -= ox * dt * 2.6;
        oy -= oy * dt * 2.6;
        dx_[i] = ox;
        dy_[i] = oy;

        const a = base[i] * (1 - twinkleAmount + twinkleAmount * Math.sin(t * spd[i] + ph[i]));
        let b = (a * buckets) | 0;
        if (b >= buckets) b = buckets - 1;
        else if (b < 0) b = 0;
        bucket[b * N + count[b]++] = i;
      }
    },
    draw(ctx, env) {
      if (!N || this.opacity <= 0.002) return;
      const zk = env.camera.k;
      const zooming = env.camera.moving;
      const { cx, cy } = env;

      // posições do quadro em buffers pré-alocados: nada de [x,y] por estrela
      for (let i = 0; i < N; i++) {
        let x = px_[i] + dx_[i];
        let y = py_[i] + dy_[i];
        if (zooming) {
          x = cx + (x - cx) * zk;
          y = cy + (y - cy) * zk;
        }
        vx_[i] = x;
        vy_[i] = y;
      }

      // linhas: um único stroke para toda a camada
      ctx.globalAlpha = this.lineAlpha * env.camera.fade * this.opacity;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let e = 0; e < edges.length; e += 2) {
        const a = edges[e];
        const b = edges[e + 1];
        ctx.moveTo(vx_[a], vy_[a]);
        ctx.lineTo(vx_[b], vy_[b]);
      }
      ctx.stroke();

      ctx.fillStyle = '#fff';
      for (let b = 0; b < buckets; b++) {
        const n = count[b];
        if (!n) continue;
        ctx.globalAlpha = ((b + 0.5) / buckets) * this.opacity;
        ctx.beginPath();
        const off = b * N;
        for (let k = 0; k < n; k++) {
          const i = bucket[off + k];
          const r = sz[i];
          ctx.moveTo(vx_[i] + r, vy_[i]);
          ctx.arc(vx_[i], vy_[i], r, 0, TAU);
        }
        ctx.fill();
      }
    },
  };
}
