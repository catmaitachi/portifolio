import { fastSin, TAU } from '../math';
import type { FadableLayer, StageEnv } from '../types';

interface BlackHoleOptions {
  name?: string;
  z?: number;
  /** raio do horizonte, em fração de min(W,H) */
  radius?: number;
  strength?: number;
  plasma?: { size: number; alpha: number; fps: number; speed: number };
  halo?: { inner: number; outer: number; reach: number };
  dust?: { count: number; speed: number };
}

export interface BlackHoleLayer extends FadableLayer {
  /** presença 0..1: encolhe o raio, apaga o desenho e corta a gravidade */
  strength: number;
  /** raio atual em px, já com força e câmera aplicadas */
  radiusPx(env: StageEnv): number;
}

/**
 * Buraco negro: plasma, poeira em órbita, halo e horizonte.
 *
 * `strength` é a única alavanca de presença — em 0 a camada inteira é pulada e
 * `env.bus.gravity` deixa de ser publicada, o que devolve as estrelas ao repouso
 * pela mola do próprio Starfield. É assim que ele "se afasta" ao sair do Início.
 *
 * O horizonte tem borda **preta** suavizando para fora (`bordaG`), nunca uma
 * borda brilhante: o brilho vem do halo por baixo, não de um contorno.
 */
export function BlackHole({
  name = 'blackhole',
  z = 20,
  radius = 0.14,
  strength = 1,
  plasma = { size: 96, alpha: 0.22, fps: 20, speed: 1.6 },
  halo = { inner: 0.18, outer: 0.06, reach: 3.4 },
  dust = { count: 260, speed: 0.6 },
}: BlackHoleOptions = {}): BlackHoleLayer {
  /* plasma: campo de senos num buffer de 96×96, tudo por LUT */
  const P = plasma.size;
  const pcv = document.createElement('canvas');
  pcv.width = P;
  pcv.height = P;
  const pctx = pcv.getContext('2d')!;
  const pimg = pctx.createImageData(P, P);
  const pd = pimg.data;
  // máscara (anel) e raio pré-calculados: constantes por pixel, não por quadro
  const pmask = new Float32Array(P * P);
  const prad = new Float32Array(P * P);
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      const nx = (x - P / 2) / (P / 2);
      const ny = (y - P / 2) / (P / 2);
      const r = Math.sqrt(nx * nx + ny * ny);
      pmask[y * P + x] =
        Math.max(0, Math.min(1, (r - 0.11) / 0.1)) * Math.max(0, 1 - Math.pow(r / 0.95, 1.7));
      const dx = (x - P / 2) / 13;
      const dy = (y - P / 2) / 13;
      prad[y * P + x] = Math.sqrt(dx * dx + dy * dy) * 1.6;
    }
  }
  // curva de contraste do plasma, também em tabela
  const POW = new Float32Array(257);
  for (let i = 0; i <= 256; i++) POW[i] = Math.pow(i / 256, 3.2) * 255;

  const paintPlasma = (time: number) => {
    const cos = Math.cos(time * 0.3);
    const sin = Math.sin(time * 0.3);
    const t1 = time;
    const t2 = time * 0.7;
    const t3 = time * 1.4;
    const t4 = time * 0.5;
    for (let y = 0; y < P; y++) {
      const dy = (y - P / 2) / 13;
      const bx = -dy * sin;
      const by = dy * cos;
      for (let x = 0; x < P; x++) {
        const dx = (x - P / 2) / 13;
        const rx = dx * cos + bx;
        const ry = dx * sin + by;
        const k = y * P + x;
        const v =
          fastSin(rx + t1) + fastSin(ry * 0.9 - t2) + fastSin(prad[k] - t3) + fastSin((rx + ry) * 0.7 + t4);
        let q = ((v + 4) * 32) | 0;
        if (q < 0) q = 0;
        else if (q > 256) q = 256;
        const g = POW[q];
        const i = k * 4;
        pd[i] = g;
        pd[i + 1] = g;
        pd[i + 2] = g;
        pd[i + 3] = g * pmask[k];
      }
    }
    pctx.putImageData(pimg, 0, 0);
  };

  /* poeira orbitando o horizonte: órbita kepleriana (mais perto = mais rápido) */
  const NO = dust.count;
  const oa = new Float32Array(NO);
  const orb = new Float32Array(NO);
  const osz = new Float32Array(NO);
  for (let i = 0; i < NO; i++) {
    oa[i] = Math.random() * TAU;
    // expoente 1.6 concentra a poeira perto do horizonte
    orb[i] = 1.05 + Math.pow(Math.random(), 1.6) * 1.1;
    osz[i] = 0.3 + Math.random() * 0.7;
  }

  let R0 = 0;
  let acc = 1 / plasma.fps;
  // Degradês em cache: dependem só de (centro, raio, força). Na cena parada eles
  // param de ser recriados — createRadialGradient por quadro é alocação pura.
  let gk = -1;
  let gr = -1;
  let gcx = -1;
  let gcy = -1;
  let haloG: CanvasGradient | null = null;
  let bordaG: CanvasGradient | null = null;

  return {
    name,
    z,
    strength,
    radiusPx(env) {
      return R0 * this.strength * env.camera.k;
    },
    resize(env) {
      R0 = Math.min(env.W, env.H) * radius;
    },
    update(env) {
      if (this.strength <= 0.001) {
        env.bus.gravity = null;
        return;
      }
      env.bus.gravity = {
        x: env.cx,
        y: env.cy,
        radius: R0,
        reach: R0 * 6.2,
        k: this.strength,
      };
      acc += env.dt;
      if (acc >= 1 / plasma.fps) {
        acc = 0;
        paintPlasma(env.t * plasma.speed);
      }
      const step = env.dt * dust.speed * 0.35;
      for (let i = 0; i < NO; i++) oa[i] += step * Math.pow(1 / orb[i], 1.5);
    },
    draw(ctx, env) {
      const k = this.strength;
      if (k <= 0.001) return;
      const { cx, cy } = env;
      const R = this.radiusPx(env);

      ctx.globalCompositeOperation = 'lighter';

      const ps = R * 9;
      ctx.globalAlpha = plasma.alpha * k;
      ctx.drawImage(pcv, cx - ps / 2, cy - ps / 2, ps, ps);

      // dois grupos de poeira = dois fills, cada um com sua opacidade
      for (let g = 0; g < 2; g++) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        for (let i = g; i < NO; i += 2) {
          const rr = orb[i] * R;
          const px = cx + Math.cos(oa[i]) * rr;
          const py = cy + Math.sin(oa[i]) * rr;
          const sz = osz[i];
          ctx.moveTo(px + sz, py);
          ctx.arc(px, py, sz, 0, TAU);
        }
        ctx.globalAlpha = (g ? 0.5 : 0.22) * k;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      // quantiza raio e força antes de comparar: variações sub-pixel não
      // justificam recriar os degradês
      const rk = Math.round(R * 4) / 4;
      const kk = Math.round(k * 200) / 200;
      if (rk !== gr || kk !== gk || cx !== gcx || cy !== gcy) {
        gr = rk;
        gk = kk;
        gcx = cx;
        gcy = cy;
        haloG = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * halo.reach);
        haloG.addColorStop(0, `rgba(255,255,255,${(halo.inner * k).toFixed(3)})`);
        haloG.addColorStop(0.28, `rgba(255,255,255,${(halo.outer * k).toFixed(3)})`);
        haloG.addColorStop(1, 'rgba(255,255,255,0)');
        bordaG = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.25);
        bordaG.addColorStop(0, 'rgba(0,0,0,1)');
        bordaG.addColorStop(1, 'rgba(0,0,0,0)');
      }
      ctx.fillStyle = haloG!;
      ctx.beginPath();
      ctx.arc(cx, cy, R * halo.reach, 0, TAU);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fill();
      ctx.fillStyle = bordaG!;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, TAU);
      ctx.fill();
    },
  };
}
