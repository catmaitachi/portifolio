import { TAU } from '../math';
import type { Layer, StageEnv } from '../types';

interface NebulaOptions {
  name?: string;
  z?: number;
  alpha?: number;
  /** largura do buffer auxiliar, em px */
  bufferWidth?: number;
  /** quadros por segundo do repinte (a nebulosa deriva devagar) */
  fps?: number;
}

/** Massas em deriva senoidal. `a` é a opacidade do centro do degradê. */
const BLOBS = [
  { r: 0.55, ax: 0.3, ay: 0.16, sx: 0.021, sy: 0.013, px: 0.0, py: 1.1, a: 0.16 },
  { r: 0.62, ax: 0.26, ay: 0.2, sx: 0.016, sy: 0.024, px: 2.1, py: 0.4, a: 0.14 },
  { r: 0.4, ax: 0.34, ay: 0.14, sx: 0.012, sy: 0.019, px: 4.0, py: 2.6, a: 0.11 },
  { r: 0.48, ax: 0.22, ay: 0.24, sx: 0.026, sy: 0.01, px: 5.4, py: 3.7, a: 0.1 },
  { r: 0.75, ax: 0.18, ay: 0.12, sx: 0.009, sy: 0.015, px: 1.2, py: 5.0, a: 0.12 },
] as const;

/**
 * Nebulosa: variação de densidade, sem cor.
 *
 * Cinco degradês radiais num buffer de 128px repintado a 12fps e ampliado pela
 * GPU no `drawImage`. Em resolução total seriam cinco degradês de tela cheia por
 * quadro — aqui são cinco degradês de 128px a cada 83ms.
 */
export function Nebula({
  name = 'nebula',
  z = 0,
  alpha = 0.16,
  bufferWidth = 128,
  fps = 12,
}: NebulaOptions = {}): Layer & { alpha: number } {
  const cv = document.createElement('canvas');
  const c = cv.getContext('2d')!;
  const interval = 1 / fps;
  let acc = 0;

  const paint = (time: number) => {
    const w = cv.width;
    const h = cv.height;
    if (!w || !h) return;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';
    const R = Math.max(w, h);
    for (const b of BLOBS) {
      const bx = w * (0.5 + Math.sin(time * b.sx + b.px) * b.ax);
      const by = h * (0.5 + Math.cos(time * b.sy + b.py) * b.ay);
      const rad = R * b.r;
      const g = c.createRadialGradient(bx, by, 0, bx, by, rad);
      g.addColorStop(0, `rgba(255,255,255,${b.a})`);
      g.addColorStop(0.45, `rgba(255,255,255,${(b.a * 0.32).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(bx, by, rad, 0, TAU);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  };

  return {
    name,
    z,
    alpha,
    resize(env: StageEnv) {
      cv.width = bufferWidth;
      cv.height = Math.max(1, Math.round(bufferWidth * (env.H / Math.max(1, env.W))));
      paint(0);
    },
    update(env) {
      acc += env.dt;
      if (acc >= interval) {
        acc = 0;
        paint(env.t);
      }
    },
    draw(ctx, env) {
      ctx.globalAlpha = this.alpha * env.camera.fade;
      ctx.drawImage(cv, 0, 0, env.W, env.H);
    },
  };
}
