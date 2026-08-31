import type { Layer, StageEnv } from '../types';

interface MeteorsOptions {
  name?: string;
  z?: number;
  pool?: number;
  /** intervalo entre disparos, em segundos */
  gapMin?: number;
  gapMax?: number;
}

/**
 * Estrelas cadentes.
 *
 * Pool fixo de rastros, ocioso na maior parte do tempo: `life[i] <= 0` pula o
 * meteoro inteiro. O degradê do rastro é o único objeto criado por quadro e só
 * existe enquanto há meteoro vivo (no máximo 3).
 */
export function Meteors({
  name = 'meteors',
  z = 30,
  pool = 3,
  gapMin = 4,
  gapMax = 13,
}: MeteorsOptions = {}): Layer {
  const life = new Float32Array(pool);
  const dur = new Float32Array(pool);
  const x = new Float32Array(pool);
  const y = new Float32Array(pool);
  const vx = new Float32Array(pool);
  const vy = new Float32Array(pool);
  const len = new Float32Array(pool);
  let next = 2 + Math.random() * 5;

  const spawn = (env: StageEnv) => {
    let s = -1;
    for (let i = 0; i < pool; i++) {
      if (life[i] <= 0) {
        s = i;
        break;
      }
    }
    if (s < 0) return;
    const ang = Math.random() * 0.5 + 0.2;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const sp = (env.W + env.H) * (0.55 + Math.random() * 0.35);
    vx[s] = Math.cos(ang) * sp * dir;
    vy[s] = Math.sin(ang) * sp;
    x[s] = dir > 0 ? -80 + Math.random() * env.W * 0.35 : env.W + 80 - Math.random() * env.W * 0.35;
    y[s] = -60 + Math.random() * env.H * 0.45;
    len[s] = 110 + Math.random() * 160;
    dur[s] = 0.7 + Math.random() * 0.5;
    life[s] = 1e-4;
  };

  return {
    name,
    z,
    update(env) {
      next -= env.dt;
      if (next <= 0) {
        spawn(env);
        next = gapMin + Math.random() * (gapMax - gapMin);
      }
      for (let i = 0; i < pool; i++) {
        if (life[i] <= 0) continue;
        life[i] += env.dt / dur[i];
        if (life[i] >= 1) {
          life[i] = 0;
          continue;
        }
        x[i] += vx[i] * env.dt;
        y[i] += vy[i] * env.dt;
        if (x[i] < -400 || x[i] > env.W + 400 || y[i] > env.H + 400) life[i] = 0;
      }
    },
    draw(ctx) {
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < pool; i++) {
        if (life[i] <= 0) continue;
        const p = life[i];
        // acende rápido (15% da vida) e apaga no resto
        const f = p < 0.15 ? p / 0.15 : (1 - p) / 0.85;
        const inv = 1 / Math.hypot(vx[i], vy[i]);
        const tx = x[i] - vx[i] * inv * len[i];
        const ty = y[i] - vy[i] * inv * len[i];
        const g = ctx.createLinearGradient(x[i], y[i], tx, ty);
        g.addColorStop(0, `rgba(255,255,255,${(0.9 * f).toFixed(3)})`);
        g.addColorStop(0.4, `rgba(255,255,255,${(0.25 * f).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x[i], y[i]);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    },
  };
}
